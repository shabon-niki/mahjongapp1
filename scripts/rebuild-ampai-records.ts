/**
 * 「Timewitch麻雀部」の対局記録を、Table(卓)/TableMember/Game/GameResultの
 * 正式な構造で作り直すワンショットスクリプト。
 *
 * 前提(ユーザー確定): シートの「点数」がそのまま正しい最終ポイント
 * (totalRankingPoint)。ウマ(1位+10/2位+5/3位-5/4位-10, 25000持ち25000返し=
 * オカ無し)は既にこの点数に含まれているとみなし、そこから逆算して
 * rawScorePoint = 点数 - ウマ を内訳として保存する(合計は必ず元の点数と一致する)。
 *
 * 対局記録(Table)は「同じ日に打った対局をまとめる単位」なので、日付ごとに
 * Tableを1つ作り、その日に登場した全員をロスター(TableMember)にする。
 *
 * 重要: scoreEngine.calculateGameResults()は最終持ち点の大小からrankを
 * 再計算するため、接戦の対局では「点数-ウマ」から逆算したfinalScoreの順序が
 * シート記載の順位と一致しない場合がある(実際に1件確認済み)。そのため
 * このスクリプトではcalculateGameResults()を使わず、シートのrank/点数を
 * そのままGameResultへ直接書き込む(finalScoreは内訳表示用の参考値)。
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import type { RuleSnapshot } from "../src/lib/mahjong/scoreEngine";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const TARGET_GROUP_ID = "cmsxv3e6c000104l1x6rw5rfw";

const EMAIL_OVERRIDES: Record<string, string> = {
  しゃぼん: "daisuke-ito@timewitch.jp",
  スターミー: "kenmiura0517@gmail.com",
  もも: "arisa-koyama@timewitch.jp",
  びたん: "yuki-mitsuya@timewitch.jp",
};

const UMA = [10, 5, -5, -10];

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
  console.error("使い方: tsx scripts/rebuild-ampai-records.ts <ampai.jsonのパス>");
  process.exit(1);
}
const data = JSON.parse(readFileSync(DATA_PATH, "utf-8")) as {
  users: SheetUser[];
  games: SheetGame[];
};

/** 2025/9/1・9/2に補正済みの2局分の日付上書き(gameId: date) */
const DATE_OVERRIDES: Record<number, string> = {
  1: "2025-09-01",
  2: "2025-09-02",
};

function playedAtFor(dateStr: string): Date {
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

  console.log("既存の対局記録(Table/Game)を削除しています...");
  const existingTableIds = (
    await prisma.table.findMany({ where: { groupId: group.id }, select: { id: true } })
  ).map((t) => t.id);
  const existingGameIds = (
    await prisma.game.findMany({ where: { groupId: group.id }, select: { id: true } })
  ).map((g) => g.id);
  await prisma.gameResult.deleteMany({ where: { gameId: { in: existingGameIds } } });
  await prisma.game.deleteMany({ where: { groupId: group.id } });
  await prisma.tableMember.deleteMany({ where: { tableId: { in: existingTableIds } } });
  await prisma.table.deleteMany({ where: { groupId: group.id } });
  console.log(`削除: Table ${existingTableIds.length}件 / Game ${existingGameIds.length}件`);

  // 日付ごとにグルーピング(日付補正を適用したうえで)
  const gamesByDate = new Map<string, SheetGame[]>();
  for (const g of data.games) {
    const date = DATE_OVERRIDES[g.gameId] ?? g.date;
    const list = gamesByDate.get(date) ?? [];
    list.push(g);
    gamesByDate.set(date, list);
  }
  const sortedDates = Array.from(gamesByDate.keys()).sort();

  const ruleSnapshotJson = JSON.stringify(RULE);
  let tableCount = 0;
  let gameCount = 0;

  for (const date of sortedDates) {
    const games = gamesByDate.get(date)!;
    const playedAt = playedAtFor(date);

    // その日に登場した全員を初出順でロスター化
    const rosterOrder: string[] = [];
    const seen = new Set<string>();
    for (const g of games) {
      for (const p of g.players) {
        if (!seen.has(p.nickname)) {
          seen.add(p.nickname);
          rosterOrder.push(p.nickname);
        }
      }
    }

    const table = await prisma.table.create({
      data: {
        groupId: group.id,
        playedDate: playedAt,
        status: "locked",
        lockedAt: playedAt,
        createdByUserId: ownerUserId,
        members: {
          create: rosterOrder.map((nickname, i) => {
            const userId = nicknameToUserId.get(nickname);
            if (!userId) throw new Error(`未解決のニックネーム: ${nickname}`);
            return { userId, seatOrder: i };
          }),
        },
      },
    });
    tableCount++;

    for (let i = 0; i < games.length; i++) {
      const g = games[i];
      await prisma.game.create({
        data: {
          groupId: group.id,
          tableId: table.id,
          hanchanNumber: i + 1,
          playedAt,
          ruleSnapshot: ruleSnapshotJson,
          status: "confirmed",
          createdByUserId: ownerUserId,
          results: {
            create: g.players.map((p) => {
              const userId = nicknameToUserId.get(p.nickname);
              if (!userId) throw new Error(`未解決のニックネーム: ${p.nickname}`);
              const umaPoint = UMA[p.rank - 1];
              const rawScorePoint = p.point - umaPoint;
              return {
                userId,
                seatOrder: p.rank - 1,
                finalScore: Math.round(25000 + rawScorePoint * 1000),
                rank: p.rank,
                rawScorePoint,
                umaPoint,
                okaPoint: 0,
                chipCount: 0,
                chipPoint: 0,
                penaltyPoint: 0,
                totalRankingPoint: p.point,
              };
            }),
          },
        },
      });
      gameCount++;
    }
  }

  console.log(`完了しました。Table ${tableCount}件 / Game ${gameCount}件`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
