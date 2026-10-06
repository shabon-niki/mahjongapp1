"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireMembership } from "@/lib/auth";
import {
  calculateGameResults,
  toRuleSnapshot,
  parseRuleSnapshot,
  type PlayerInput,
} from "@/lib/mahjong/scoreEngine";

type PlayerFormInput = { userId: string; finalScore: number; chipCount: number };

/**
 * 募集(Event)経由の対局が「対局記録」一覧(Table単位)にも表示されるよう、
 * そのEventに紐づくTableを取得(なければ作成)する。1つのEventの対局は
 * 同じ「集まり」とみなし、複数回記録しても同じTableに半荘として積み上げる。
 */
async function findOrCreateEventTable(
  groupId: string,
  eventId: string,
  createdByUserId: string,
  playerUserIds: string[]
) {
  const existing = await prisma.game.findFirst({
    where: { eventId, tableId: { not: null } },
    select: { tableId: true },
  });

  if (existing?.tableId) {
    const tableId = existing.tableId;
    const existingMembers = await prisma.tableMember.findMany({
      where: { tableId },
      select: { userId: true },
    });
    const existingIds = new Set(existingMembers.map((m) => m.userId));
    const newIds = playerUserIds.filter((id) => !existingIds.has(id));
    if (newIds.length > 0) {
      let seatOrder = existingMembers.length;
      await prisma.tableMember.createMany({
        data: newIds.map((userId) => ({ tableId, userId, seatOrder: seatOrder++ })),
      });
    }
    return tableId;
  }

  const event = await prisma.event.findUniqueOrThrow({ where: { id: eventId } });
  const table = await prisma.table.create({
    data: {
      groupId,
      playedDate: event.eventDatetime,
      createdByUserId,
      members: { create: playerUserIds.map((userId, i) => ({ userId, seatOrder: i })) },
    },
  });
  return table.id;
}

function toGameResultRows(results: ReturnType<typeof calculateGameResults>) {
  return results.map((r) => ({
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
  }));
}

/** 対局を新規作成する(仕様19章)。現在のGroupRuleをスナップショットとして保存する。 */
export async function createGame(
  groupId: string,
  eventId: string | null,
  players: PlayerFormInput[]
) {
  const { user, membership } = await requireMembership(groupId);
  if (players.length !== 4) throw new Error("4人分の入力が必要です");

  const groupRule = await prisma.groupRule.findUniqueOrThrow({ where: { groupId } });
  if (groupRule.resultEntryPermission === "owner_only" && membership.role !== "owner") {
    throw new Error("この麻雀部では管理者のみが対局結果を記録できます");
  }
  const ruleSnapshot = toRuleSnapshot(groupRule);

  const inputs: PlayerInput[] = players.map((p, i) => ({
    userId: p.userId,
    seatOrder: i,
    finalScore: p.finalScore,
    chipCount: p.chipCount,
  }));
  const results = calculateGameResults(inputs, ruleSnapshot);

  const tableId = eventId
    ? await findOrCreateEventTable(
        groupId,
        eventId,
        user.id,
        players.map((p) => p.userId)
      )
    : null;
  const lastHanchan = tableId
    ? await prisma.game.findFirst({ where: { tableId }, orderBy: { hanchanNumber: "desc" } })
    : null;
  const hanchanNumber = tableId ? (lastHanchan?.hanchanNumber ?? 0) + 1 : undefined;

  const game = await prisma.game.create({
    data: {
      groupId,
      eventId: eventId ?? undefined,
      tableId: tableId ?? undefined,
      hanchanNumber,
      ruleSnapshot: JSON.stringify(ruleSnapshot),
      status: "draft",
      createdByUserId: user.id,
      results: { create: toGameResultRows(results) },
    },
  });

  revalidatePath(`/g/${groupId}`);
  revalidatePath(`/g/${groupId}/ranking`);
  redirect(`/g/${groupId}/games/${game.id}`);
}

/**
 * 対局結果を修正する(仕様27章)。必ずそのGame作成時点のrule_snapshotを使い、
 * GroupRuleが後で変わっていても過去対局の計算結果は変化しないようにする。
 */
export async function updateGame(groupId: string, gameId: string, players: PlayerFormInput[]) {
  const { user, membership } = await requireMembership(groupId);
  const game = await prisma.game.findUnique({ where: { id: gameId } });
  if (!game || game.groupId !== groupId) return;
  if (game.createdByUserId !== user.id && membership.role !== "owner") return;
  if (players.length !== 4) throw new Error("4人分の入力が必要です");

  const ruleSnapshot = parseRuleSnapshot(game.ruleSnapshot);
  const inputs: PlayerInput[] = players.map((p, i) => ({
    userId: p.userId,
    seatOrder: i,
    finalScore: p.finalScore,
    chipCount: p.chipCount,
  }));
  const results = calculateGameResults(inputs, ruleSnapshot);

  await prisma.gameResult.deleteMany({ where: { gameId } });
  await prisma.gameResult.createMany({
    data: toGameResultRows(results).map((r) => ({ ...r, gameId })),
  });

  revalidatePath(`/g/${groupId}/games/${gameId}`);
  revalidatePath(`/g/${groupId}/ranking`);
  revalidatePath(`/g/${groupId}/mypage`);
  redirect(`/g/${groupId}/games/${gameId}`);
}

/** 下書きを確定する。Event参加者のplayed実績を反映する(仕様14, 34章)。 */
export async function confirmGame(groupId: string, gameId: string) {
  await requireMembership(groupId);
  const game = await prisma.game.findUnique({ where: { id: gameId }, include: { results: true } });
  if (!game || game.groupId !== groupId) return;

  await prisma.game.update({ where: { id: gameId }, data: { status: "confirmed" } });

  if (game.eventId) {
    const eventId = game.eventId;
    const playedAt = new Date();
    await Promise.all(
      game.results.map((r) =>
        prisma.entry.updateMany({
          where: { eventId, userId: r.userId },
          data: { status: "played", playedAt },
        })
      )
    );
    const remaining = await prisma.entry.count({
      where: { eventId, status: { in: ["entered", "selected"] } },
    });
    if (remaining === 0) {
      await prisma.event.update({ where: { id: eventId }, data: { status: "completed" } });
    }
    revalidatePath(`/g/${groupId}/events/${eventId}`);
  }

  revalidatePath(`/g/${groupId}/games/${gameId}`);
  revalidatePath(`/g/${groupId}/ranking`);
  revalidatePath(`/g/${groupId}/mypage`);
  revalidatePath(`/g/${groupId}`);
}

/** この対局を無効にする。ランキング集計から除外されるが記録は残す(仕様27章)。 */
export async function voidGame(groupId: string, gameId: string) {
  const { user, membership } = await requireMembership(groupId);
  const game = await prisma.game.findUnique({ where: { id: gameId } });
  if (!game || game.groupId !== groupId) return;
  if (game.createdByUserId !== user.id && membership.role !== "owner") return;

  await prisma.game.update({ where: { id: gameId }, data: { status: "void" } });

  revalidatePath(`/g/${groupId}/games/${gameId}`);
  revalidatePath(`/g/${groupId}/ranking`);
  revalidatePath(`/g/${groupId}/mypage`);
}

/** 下書きを破棄する(確定前のみ)。 */
export async function discardDraftGame(groupId: string, gameId: string) {
  const { user, membership } = await requireMembership(groupId);
  const game = await prisma.game.findUnique({ where: { id: gameId } });
  if (!game || game.groupId !== groupId || game.status !== "draft") return;
  if (game.createdByUserId !== user.id && membership.role !== "owner") return;

  await prisma.gameResult.deleteMany({ where: { gameId } });
  await prisma.game.delete({ where: { id: gameId } });

  if (game.tableId) {
    const remaining = await prisma.game.count({ where: { tableId: game.tableId } });
    if (remaining === 0) {
      await prisma.tableMember.deleteMany({ where: { tableId: game.tableId } });
      await prisma.table.delete({ where: { id: game.tableId } });
    }
  }

  revalidatePath(`/g/${groupId}/ranking`);
  redirect(game.eventId ? `/g/${groupId}/events/${game.eventId}` : `/g/${groupId}`);
}
