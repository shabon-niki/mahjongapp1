import Link from "next/link";
import { requireMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getConfirmedGameResults } from "@/lib/mahjong/queries";
import { calculateRanking, toPlayCountBonusRule } from "@/lib/mahjong/ranking";
import { computeTableStandings } from "@/lib/mahjong/tableStats";
import {
  getSeasonYear,
  getQuarterForDate,
  getSeasonRange,
  getQuarterRange,
  seasonShortLabel,
} from "@/lib/mahjong/season";
import { formatDate } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { DecorativeDivider } from "@/components/ui/DecorativeDivider";

const MEDALS = ["🥇", "🥈", "🥉"];

const signed = (n: number) => `${n > 0 ? "+" : ""}${Math.round(n * 10) / 10}`;

export default async function GroupHomePage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const { user, membership } = await requireMembership(groupId);
  const isOwner = membership.role === "owner";

  const group = await prisma.group.findUniqueOrThrow({
    where: { id: groupId },
    include: { rule: true },
  });
  const playCountBonusRule = group.rule ? toPlayCountBonusRule(group.rule) : undefined;

  const now = new Date();
  const seasonYear = getSeasonYear(now, group.seasonStartMonth);
  const quarter = getQuarterForDate(now, group.seasonStartMonth).quarter;
  const seasonRange = getSeasonRange(seasonYear, group.seasonStartMonth);
  const quarterRange = getQuarterRange(seasonYear, quarter, group.seasonStartMonth);

  const [results, memberCount, recentTables] = await Promise.all([
    getConfirmedGameResults(groupId),
    prisma.groupMembership.count({ where: { groupId } }),
    prisma.table.findMany({
      where: { groupId },
      include: {
        members: { include: { user: true }, orderBy: { seatOrder: "asc" } },
        games: { include: { results: true } },
      },
      orderBy: { playedDate: "desc" },
      take: 3,
    }),
  ]);

  const quarterRanking = calculateRanking(results, quarterRange, playCountBonusRule);
  const seasonRanking = calculateRanking(results, seasonRange, playCountBonusRule);
  const myQuarter = quarterRanking.find((r) => r.userId === user.id);
  const mySeason = seasonRanking.find((r) => r.userId === user.id);
  const podium = quarterRanking.slice(0, 3);
  const seasonName = seasonShortLabel(seasonYear, group.seasonNumberOffset);

  const tiles: { href: string; icon: string; title: string; note: string; show: boolean }[] = [
    {
      href: `/g/${groupId}/members`,
      icon: "👥",
      title: "メンバー・招待",
      note: `${memberCount}人が参加中。招待リンクはこちら`,
      show: true,
    },
    {
      href: `/g/${groupId}/calc`,
      icon: "🧮",
      title: "点数計算",
      note: "牌をタップして役と点数を確認",
      show: true,
    },
    {
      href: `/g/${groupId}/settings`,
      icon: "⚙️",
      title: "麻雀ルール設定",
      note: "持ち点・ウマ・オカ・チップなど",
      show: isOwner,
    },
    {
      href: "/groups",
      icon: "🔄",
      title: "麻雀部の切り替え",
      note: "所属一覧・新しい麻雀部の作成",
      show: true,
    },
  ];

  return (
    <div className="space-y-6">
      <section className="-mx-4 -mt-5 overflow-hidden bg-board-800 px-4 pt-6 pb-6 text-washi-100">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs tracking-widest text-gold-400">{group.name}</p>
            <h1 className="mt-1 font-serif text-2xl font-bold">
              {seasonName} <span className="text-gold-400">Q{quarter}</span>
            </h1>
          </div>
          <span className="shrink-0 rounded-full border border-gold-400/40 px-3 py-1 text-xs text-washi-200">
            👥 {memberCount}人
          </span>
        </div>

        <DecorativeDivider className="my-4" />

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-washi-100/10 px-3 py-3">
            <p className="text-[11px] text-washi-200/70">今クォーターのあなた</p>
            {myQuarter ? (
              <p className="mt-1 font-serif text-2xl font-bold">
                {myQuarter.rank}
                <span className="text-sm">位</span>
                <span className="ml-2 text-sm font-medium text-gold-400">
                  {signed(myQuarter.totalPoint)}
                </span>
              </p>
            ) : (
              <p className="mt-2 text-sm text-washi-200/80">まだ対局なし</p>
            )}
          </div>
          <div className="rounded-xl bg-washi-100/10 px-3 py-3">
            <p className="text-[11px] text-washi-200/70">{seasonName}の通算</p>
            {mySeason ? (
              <p className="mt-1 font-serif text-2xl font-bold">
                {mySeason.rank}
                <span className="text-sm">位</span>
                <span className="ml-2 text-sm font-medium text-gold-400">
                  {signed(mySeason.totalPoint)}
                </span>
              </p>
            ) : (
              <p className="mt-2 text-sm text-washi-200/80">まだ対局なし</p>
            )}
          </div>
        </div>

        <Link
          href={`/g/${groupId}/tables/new`}
          className="mt-4 flex items-center justify-center gap-2 rounded-full bg-gold-500 py-3 text-sm font-bold text-board-900 shadow-md transition-colors hover:bg-gold-400 active:bg-gold-600"
        >
          📝 対局を記録する
        </Link>
      </section>

      <section className="space-y-2">
        <div className="flex items-end justify-between">
          <h2 className="font-serif text-base font-bold text-ink-900">今クォーターのトップ</h2>
          <Link href={`/g/${groupId}/ranking`} className="text-xs text-board-800 underline underline-offset-2">
            ランキングを見る ›
          </Link>
        </div>
        {podium.length === 0 ? (
          <Card className="p-4 text-sm text-ink-400">
            このクォーターの対局記録はまだありません。最初の一局を記録してみましょう。
          </Card>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {podium.map((entry, i) => (
              <Link key={entry.userId} href={`/g/${groupId}/members/${entry.userId}`}>
                <Card
                  className={`flex h-full flex-col items-center px-2 py-3 text-center transition-colors hover:border-gold-500/60 ${
                    entry.userId === user.id ? "border-gold-500 bg-gold-500/5" : ""
                  }`}
                >
                  <span className="text-2xl">{MEDALS[i]}</span>
                  <span className="mt-1 w-full truncate text-sm font-semibold text-ink-900">
                    {entry.userName}
                  </span>
                  <span
                    className={`mt-0.5 text-sm font-bold ${
                      entry.totalPoint >= 0 ? "text-board-800" : "text-red-600"
                    }`}
                  >
                    {signed(entry.totalPoint)}
                  </span>
                  <span className="text-[11px] text-ink-400">{entry.gamesPlayed}半荘</span>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-2">
        <div className="flex items-end justify-between">
          <h2 className="font-serif text-base font-bold text-ink-900">最近の対局記録</h2>
          <Link
            href={`/g/${groupId}/ranking?view=records`}
            className="text-xs text-board-800 underline underline-offset-2"
          >
            すべて見る ›
          </Link>
        </div>
        {recentTables.length === 0 ? (
          <Card className="p-4 text-sm text-ink-400">対局記録はまだありません。</Card>
        ) : (
          <Card className="divide-y divide-ink-400/10">
            {recentTables.map((table) => {
              const standings = computeTableStandings(
                table.members.map((m) => ({ userId: m.userId, userName: m.user.name })),
                table.games.map((g) => ({
                  hanchanNumber: g.hanchanNumber ?? 0,
                  results: g.results.map((r) => ({
                    userId: r.userId,
                    totalRankingPoint: r.totalRankingPoint,
                  })),
                }))
              );
              return (
                <Link
                  key={table.id}
                  href={`/g/${groupId}/tables/${table.id}`}
                  className="block px-4 py-3 hover:bg-gold-500/5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-ink-900">
                      {formatDate(table.playedDate)}
                    </span>
                    <Badge tone={table.status === "open" ? "gold" : "neutral"}>
                      {table.games.length}半荘
                    </Badge>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-ink-600">
                    {standings.map((s, i) => (
                      <span key={s.userId} className={i === 0 ? "font-semibold text-board-800" : ""}>
                        {i === 0 && "👑 "}
                        {s.userName} {signed(s.total)}
                      </span>
                    ))}
                  </div>
                </Link>
              );
            })}
          </Card>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="font-serif text-base font-bold text-ink-900">麻雀部</h2>
        <div className="grid grid-cols-2 gap-3">
          {tiles
            .filter((t) => t.show)
            .map((t) => (
              <Link key={t.href} href={t.href}>
                <Card className="flex h-full flex-col gap-1 p-4 transition-colors hover:border-gold-500/60 active:bg-gold-500/5">
                  <span className="text-2xl">{t.icon}</span>
                  <span className="text-sm font-semibold text-ink-900">{t.title}</span>
                  <span className="text-xs leading-relaxed text-ink-400">{t.note}</span>
                </Card>
              </Link>
            ))}
        </div>
      </section>
    </div>
  );
}
