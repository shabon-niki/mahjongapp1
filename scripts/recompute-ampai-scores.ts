/**
 * 「Timewitch麻雀部」の対局記録を、シートの「点数」を素点(rawScorePoint)
 * として扱い、指定のルール(持ち点25000/ウマ5-10/オカ無し/チップなし/
 * 五捨六入/ペナルティ無し)でscoreEngine.calculateGameResults()から
 * 正しく再計算して作り直すワンショットスクリプト。
 *
 * import-ampai.tsで作成した対局記録(点数を直接totalRankingPointに
 * 入れていた簡易インポート)を削除し、同じ素点にウマを乗せた正しい
 * 内訳(rawScorePoint/umaPoint/totalRankingPoint等)で再作成する。
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { calculateGameResults, type RuleSnapshot, type PlayerInput } from "../src/lib/mahjong/scoreEngine";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const TARGET_GROUP_ID = "cmsxv3e6c000104l1x6rw5rfw";

/** ニックネーム→実メールアドレスの上書き(既存アカウント直結・訂正分) */
const EMAIL_OVERRIDES: Record<string, string> = {
  しゃぼん: "daisuke-ito@timewitch.jp",
  スターミー: "kenmiura0517@gmail.com",
  もも: "arisa-koyama@timewitch.jp",
  びたん: "yuki-mitsuya@timewitch.jp",
};

const RULE: RuleSnapshot = {
  startingPoints: 25000,
  umaFirst: 10,
  umaSecond: 5,
  umaThird: -5,
  umaFourth: -10,
  okaEnabled: false,
  okaPoints: 0,
  chipEnabled: false,
  chipValue: 0,
  redDoraChipEnabled: false,
  ippatsuChipEnabled: false,
  uraDoraChipEnabled: false,
  bustPenaltyEnabled: false,
  bustPenaltyValue: 0,
  yakitoriEnabled: false,
  roundingRule: "gosha_rokunyu",
  tieRule: "seat_order",
};

type SheetUser = { userId: number; nickname: string; firstName: string; lastName: string };
type SheetPlayer = { rank: number; nickname: string; point: number };
type SheetGame = { gameId: number; date: string; players: SheetPlayer[] };

const DATA_PATH = process.argv[2];
if (!DATA_PATH) {
  console.error("使い方: tsx scripts/recompute-ampai-scores.ts <ampai.jsonのパス>");
  process.exit(1);
}
const data = JSON.parse(readFileSync(DATA_PATH, "utf-8")) as {
  users: SheetUser[];
  games: SheetGame[];
};

function parsePlayedAt(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d, 19, 0, 0);
}

async function main() {
  const group = await prisma.group.findUniqueOrThrow({ where: { id: TARGET_GROUP_ID } });

  const nicknameToUserId = new Map<string, string>();
  for (const u of data.users) {
    const email = EMAIL_OVERRIDES[u.nickname] ?? `${u.firstName}-${u.lastName}@timewitch.jp`;
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    nicknameToUserId.set(u.nickname, user.id);
  }
  const guestUsers = await prisma.user.findMany({ where: { isGuest: true } });
  for (const g of guestUsers) nicknameToUserId.set(g.name, g.id);

  const ownerUserId = nicknameToUserId.get("しゃぼん");
  if (!ownerUserId) throw new Error("オーナー(しゃぼん)が見つかりません");

  console.log("既存の対局記録を削除しています...");
  const existingGameIds = (
    await prisma.game.findMany({ where: { groupId: group.id }, select: { id: true } })
  ).map((g) => g.id);
  await prisma.gameResult.deleteMany({ where: { gameId: { in: existingGameIds } } });
  await prisma.game.deleteMany({ where: { groupId: group.id } });
  console.log(`削除件数: ${existingGameIds.length}`);

  const ruleSnapshotJson = JSON.stringify(RULE);

  console.log(`対局記録を素点から再計算して作成しています...(${data.games.length}件)`);
  for (const g of data.games) {
    const playedAt = parsePlayedAt(g.date);
    const playerInputs: PlayerInput[] = g.players.map((p) => {
      const userId = nicknameToUserId.get(p.nickname);
      if (!userId) throw new Error(`未解決のニックネーム: ${p.nickname}`);
      return {
        userId,
        seatOrder: p.rank - 1,
        finalScore: 25000 + p.point * 1000,
      };
    });
    const results = calculateGameResults(playerInputs, RULE);

    await prisma.game.create({
      data: {
        groupId: group.id,
        playedAt,
        ruleSnapshot: ruleSnapshotJson,
        status: "confirmed",
        createdByUserId: ownerUserId,
        results: {
          create: results.map((r) => ({
            userId: r.userId,
            seatOrder: r.seatOrder,
            finalScore: r.finalScore,
            rank: r.rank,
            rawScorePoint: r.rawScorePoint,
            umaPoint: r.umaPoint,
            okaPoint: r.okaPoint,
            chipCount: r.chipCount,
            chipPoint: r.chipPoint,
            penaltyPoint: r.penaltyPoint,
            totalRankingPoint: r.totalRankingPoint,
          })),
        },
      },
    });
  }

  console.log("完了しました。");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
