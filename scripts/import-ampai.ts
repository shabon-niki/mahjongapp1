/**
 * 「Timewitch麻雀部」(既存グループ、旧名「7期寝ろ。カップ」)へ、
 * 過去の対局記録(Ampai_第6期対局記録.xlsx)を一括インポートするワンショットスクリプト。
 *
 * - 既に本登録済みの人(しゃぼん=daisuke-ito@timewitch.jp、
 *   スターミー=kenmiura0517@gmail.com)は既存アカウントへ直接紐づける。
 * - それ以外の未登録ユーザーは firstName-lastName@timewitch.jp で
 *   プレースホルダーアカウント(パスワード未設定)を作成する。本人が同じ
 *   メールアドレスで新規登録すると既存レコードに紐づく(login/actions.tsのregister()側で対応)。
 * - 対局データにのみ登場しユーザー一覧に無い名前(井バーナー)はゲスト参加者
 *   (isGuest=true, アカウントなし)として扱う。
 * - 点数(1位点数〜4位点数)はウマ・オカ等を含む既算出の最終ポイントのため、
 *   totalRankingPoint / rawScorePoint にそのまま入れ、finalScore は
 *   25000 + point*1000 で近似する(内訳(ウマ/オカ)は再現できないため)。
 * - グループの季節(第6期/第7期)は別グループを作らず、既存のシーズン年度
 *   計算(seasonStartMonth=9)にまかせる。2025/9〜2026/8の対局は自動的に
 *   「2025年度」= 第6期として、2026/9以降の対局は「2026年度」= 第7期として
 *   集計される。
 *
 * 再実行しても対局データが既にインポート済みなら何もせず終了する(冪等)。
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { DEFAULT_RULE_SNAPSHOT } from "../src/lib/mahjong/scoreEngine";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const TARGET_GROUP_ID = "cmsxv3e6c000104l1x6rw5rfw";
const TARGET_GROUP_NAME = "Timewitch麻雀部";

/** ニックネーム → 既に本登録済みの実メールアドレス(名前が一致すると確認できた人のみ) */
const KNOWN_EMAIL_BY_NICKNAME: Record<string, string> = {
  しゃぼん: "daisuke-ito@timewitch.jp",
  スターミー: "kenmiura0517@gmail.com",
};

type SheetUser = { userId: number; nickname: string; firstName: string; lastName: string };
type SheetPlayer = { rank: number; nickname: string; point: number };
type SheetGame = { gameId: number; date: string; players: SheetPlayer[] };

const DATA_PATH = process.argv[2];
if (!DATA_PATH) {
  console.error("使い方: tsx scripts/import-ampai.ts <ampai.jsonのパス>");
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

  const alreadyImported = await prisma.game.count({ where: { groupId: group.id } });
  if (alreadyImported > 0) {
    console.log(
      `Group「${group.name}」には既に${alreadyImported}件の対局があるため、インポートをスキップします。`
    );
    return;
  }

  console.log(`Groupを「${TARGET_GROUP_NAME}」にリネームします...`);
  await prisma.group.update({ where: { id: group.id }, data: { name: TARGET_GROUP_NAME } });

  console.log("ユーザーを解決しています...");
  const nicknameToUserId = new Map<string, string>();

  for (const u of data.users) {
    const knownEmail = KNOWN_EMAIL_BY_NICKNAME[u.nickname];
    const email = knownEmail ?? `${u.firstName}-${u.lastName}@timewitch.jp`;
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        name: u.nickname,
        email,
        experienceLevel: "experienced",
      },
    });
    nicknameToUserId.set(u.nickname, user.id);
    console.log(`  ${u.nickname} -> ${email}${knownEmail ? "(既存アカウント)" : "(新規プレースホルダー)"}`);
  }

  const ownerUserId = nicknameToUserId.get("しゃぼん");
  if (!ownerUserId) throw new Error("オーナー(しゃぼん/daisuke-ito)が見つかりません");

  const guestNicknames = new Set<string>();
  for (const g of data.games) {
    for (const p of g.players) {
      if (!nicknameToUserId.has(p.nickname)) guestNicknames.add(p.nickname);
    }
  }
  console.log("ゲスト参加者を作成しています...", Array.from(guestNicknames));
  for (const nickname of guestNicknames) {
    const existingGuest = await prisma.user.findFirst({
      where: { name: nickname, isGuest: true },
    });
    const guest =
      existingGuest ?? (await prisma.user.create({ data: { name: nickname, isGuest: true } }));
    nicknameToUserId.set(nickname, guest.id);
  }

  console.log("グループメンバーを追加しています...");
  for (const [nickname, userId] of Array.from(nicknameToUserId.entries())) {
    if (guestNicknames.has(nickname)) continue;
    await prisma.groupMembership.upsert({
      where: { groupId_userId: { groupId: group.id, userId } },
      update: {},
      create: { groupId: group.id, userId, role: nickname === "しゃぼん" ? "owner" : "member" },
    });
  }

  const ruleSnapshotJson = JSON.stringify(DEFAULT_RULE_SNAPSHOT);

  console.log(`対局記録を作成しています...(${data.games.length}件)`);
  for (const g of data.games) {
    const playedAt = parsePlayedAt(g.date);
    await prisma.game.create({
      data: {
        groupId: group.id,
        playedAt,
        ruleSnapshot: ruleSnapshotJson,
        status: "confirmed",
        createdByUserId: ownerUserId,
        results: {
          create: g.players.map((p) => {
            const userId = nicknameToUserId.get(p.nickname);
            if (!userId) throw new Error(`未解決のニックネーム: ${p.nickname}`);
            return {
              userId,
              seatOrder: p.rank - 1,
              finalScore: Math.round(25000 + p.point * 1000),
              rank: p.rank,
              rawScorePoint: p.point,
              umaPoint: 0,
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
  }

  console.log("完了しました。");
  console.log({ groupId: group.id, ownerUserId, userCount: nicknameToUserId.size });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
