import { prisma } from "@/lib/prisma";
import { computeTableFormation } from "@/lib/mahjong/tableFormation";
import { computePlayerStats } from "@/lib/mahjong/playerStats";
import type { EntryStatus } from "@/generated/prisma/client";

/** 有効エントリー(参加希望として数える)状態。本人キャンセル/非選定は除外する */
export const VALID_ENTRY_STATUSES: EntryStatus[] = ["entered", "selected", "played"];

export function isValidEntry(status: EntryStatus): boolean {
  return VALID_ENTRY_STATUSES.includes(status);
}

/** Group単位でイベントを取得する。他Groupのデータが絶対に混ざらないようgroupIdで絞り込む。 */
export async function getEventDetail(groupId: string, eventId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      organizer: true,
      entries: { include: { user: true }, orderBy: { enteredAt: "asc" } },
      games: { include: { results: true } },
    },
  });
  if (!event || event.groupId !== groupId) return null;
  return event;
}

export function summarizeEntries<T extends { status: EntryStatus }>(entries: T[]) {
  const valid = entries.filter((e) => isValidEntry(e.status));
  return {
    entryCount: valid.length,
    validEntries: valid,
  };
}

function withMyEntryStatus<T extends { entries: { userId: string; status: EntryStatus }[] }>(
  event: T,
  userId?: string
) {
  if (!userId) return null;
  const myEntry = event.entries.find((e) => e.userId === userId && isValidEntry(e.status));
  return myEntry?.status ?? null;
}

/** Group単位で現在募集中(status: open)の卓を取得する。userIdを渡すと本人の応募状況も付与する。 */
export async function listOpenEvents(groupId: string, userId?: string) {
  const events = await prisma.event.findMany({
    where: { groupId, status: "open" },
    include: { organizer: true, entries: true },
    orderBy: { eventDatetime: "asc" },
  });

  return events.map((event) => {
    const { entryCount } = summarizeEntries(event.entries);
    return {
      event,
      entryCount,
      formation: computeTableFormation(entryCount, event.maxTables),
      myEntryStatus: withMyEntryStatus(event, userId),
    };
  });
}

/** Group単位で募集が終了した(status: open以外)過去の卓を取得する。誰が参加したかに関わらずGroup全体を返す。 */
export async function listPastEvents(groupId: string, userId?: string) {
  const events = await prisma.event.findMany({
    where: { groupId, status: { not: "open" } },
    include: { organizer: true, entries: true },
    orderBy: { eventDatetime: "desc" },
  });

  return events.map((event) => {
    const { entryCount } = summarizeEntries(event.entries);
    return {
      event,
      entryCount,
      formation: computeTableFormation(entryCount, event.maxTables),
      myEntryStatus: withMyEntryStatus(event, userId),
    };
  });
}

/** ランキング集計用にGroup内のconfirmed対局結果のみを取得する(仕様23, 26, 32章) */
export async function getConfirmedGameResults(groupId: string) {
  const results = await prisma.gameResult.findMany({
    where: { game: { groupId, status: "confirmed" }, user: { isGuest: false } },
    include: { user: true, game: true },
  });
  return results.map((r) => ({
    userId: r.userId,
    userName: r.user.name,
    rankingPoint: r.totalRankingPoint,
    playedAt: r.game.playedAt,
  }));
}

/** 個人戦績(仕様33章)。confirmedのGameのみを対象に集計する。rangeを省略すると全期間。 */
export async function getPersonalGameStats(
  groupId: string,
  userId: string,
  range?: { start: Date; end: Date }
) {
  const results = await prisma.gameResult.findMany({
    where: {
      userId,
      game: {
        groupId,
        status: "confirmed",
        ...(range ? { playedAt: { gte: range.start, lte: range.end } } : {}),
      },
    },
    select: { rank: true, totalRankingPoint: true, finalScore: true },
  });

  return computePlayerStats(results);
}

/**
 * ある1名の参加機会レコメンド用の統計をGroup単位で計算する(仕様13章)。
 * eventIdを指定した場合、そのイベント自身のエントリーは除外して算出する
 * (これから参加を検討している募集自体をカウントしないため)。
 */
export async function getParticipantStats(
  userId: string,
  groupId: string,
  excludeEventId?: string
) {
  const entries = await prisma.entry.findMany({
    where: {
      userId,
      event: { groupId },
      ...(excludeEventId ? { eventId: { not: excludeEventId } } : {}),
    },
  });

  const validEntryCount = entries.filter((e) => e.status !== "cancelled").length;
  const playedEntries = entries.filter((e) => e.status === "played" && e.playedAt);
  const playedCount = playedEntries.length;
  const lastPlayedAt = playedEntries.reduce<Date | null>((latest, e) => {
    if (!e.playedAt) return latest;
    if (!latest || e.playedAt > latest) return e.playedAt;
    return latest;
  }, null);

  return { validEntryCount, playedCount, lastPlayedAt };
}
