import Link from "next/link";
import { requireMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getConfirmedGameResults } from "@/lib/mahjong/queries";
import { calculateRanking, toPlayCountBonusRule, type PlayCountBonusRule } from "@/lib/mahjong/ranking";
import { computeTableStandings } from "@/lib/mahjong/tableStats";
import {
  getSeasonYear,
  getQuarterForDate,
  getSeasonRange,
  getQuarterRange,
  listQuarters,
  seasonLabel,
  seasonShortLabel,
} from "@/lib/mahjong/season";
import { formatDate } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

const MEDALS = ["🥇", "🥈", "🥉"];

type BuildHref = (overrides: {
  view?: string;
  period?: string;
  quarter?: number;
  year?: number;
}) => string;

export default async function RankingPage({
  params,
  searchParams,
}: {
  params: Promise<{ groupId: string }>;
  searchParams: Promise<{ view?: string; period?: string; quarter?: string; year?: string }>;
}) {
  const { groupId } = await params;
  await requireMembership(groupId);
  const group = await prisma.group.findUniqueOrThrow({
    where: { id: groupId },
    include: { rule: true },
  });
  const playCountBonusRule = group.rule ? toPlayCountBonusRule(group.rule) : undefined;

  const { view, period, quarter, year } = await searchParams;
  const now = new Date();
  const currentSeasonYear = getSeasonYear(now, group.seasonStartMonth);
  const currentQuarter = getQuarterForDate(now, group.seasonStartMonth).quarter;

  // 対局記録の実データ範囲(+現在シーズン)から、切り替え可能なシーズン一覧を作る
  const gameDateRange = await prisma.game.aggregate({
    where: { groupId },
    _min: { playedAt: true },
    _max: { playedAt: true },
  });
  const earliestSeasonYear = Math.min(
    gameDateRange._min.playedAt
      ? getSeasonYear(gameDateRange._min.playedAt, group.seasonStartMonth)
      : currentSeasonYear,
    currentSeasonYear
  );
  const latestSeasonYear = Math.max(
    gameDateRange._max.playedAt
      ? getSeasonYear(gameDateRange._max.playedAt, group.seasonStartMonth)
      : currentSeasonYear,
    currentSeasonYear
  );
  const availableSeasonYears: number[] = [];
  for (let y = earliestSeasonYear; y <= latestSeasonYear; y++) availableSeasonYears.push(y);

  const requestedYear = Number(year);
  const seasonYear = availableSeasonYears.includes(requestedYear)
    ? requestedYear
    : currentSeasonYear;

  const activeView = view === "records" ? "records" : "ranking";
  const mode = period === "season" ? "season" : "quarter";
  const selectedQuarter = (Number(quarter) >= 1 && Number(quarter) <= 4
    ? Number(quarter)
    : currentQuarter) as 1 | 2 | 3 | 4;

  const range =
    mode === "season"
      ? getSeasonRange(seasonYear, group.seasonStartMonth)
      : getQuarterRange(seasonYear, selectedQuarter, group.seasonStartMonth);

  const quarters = listQuarters(seasonYear, group.seasonStartMonth);

  const buildHref: BuildHref = (overrides) => {
    const resolvedView = overrides.view ?? activeView;
    const params = new URLSearchParams({
      view: resolvedView,
      year: String(overrides.year ?? seasonYear),
    });
    if (resolvedView === "ranking") {
      const resolvedMode = overrides.period ?? mode;
      params.set("period", resolvedMode);
      if (resolvedMode === "quarter") {
        params.set("quarter", String(overrides.quarter ?? selectedQuarter));
      }
    } else {
      params.set("quarter", String(overrides.quarter ?? selectedQuarter));
    }
    return `/g/${groupId}/ranking?${params.toString()}`;
  };

  return (
    <div className="space-y-5">
      <h1 className="font-serif text-lg font-bold text-ink-900">
        {activeView === "records" ? "対局記録" : "ランキング"}
      </h1>

      {availableSeasonYears.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {availableSeasonYears.map((y) => (
            <Link
              key={y}
              href={buildHref({ year: y })}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                seasonYear === y
                  ? "border-gold-500 bg-gold-500/10 text-board-800"
                  : "border-ink-400/20 text-ink-600"
              }`}
            >
              {seasonShortLabel(y, group.seasonNumberOffset)}
            </Link>
          ))}
        </div>
      )}

      <div className="flex gap-1 rounded-full bg-ink-400/10 p-1 text-sm font-medium">
        <Link
          href={buildHref({ view: "records" })}
          className={`flex-1 rounded-full py-2 text-center transition-colors ${
            activeView === "records" ? "bg-washi-100 text-board-800 shadow-sm" : "text-ink-600"
          }`}
        >
          対局記録
        </Link>
        <Link
          href={buildHref({ view: "ranking" })}
          className={`flex-1 rounded-full py-2 text-center transition-colors ${
            activeView === "ranking" ? "bg-washi-100 text-board-800 shadow-sm" : "text-ink-600"
          }`}
        >
          順位表
        </Link>
      </div>

      {activeView === "records" ? (
        <RecordsView
          groupId={groupId}
          selectedQuarter={selectedQuarter}
          quarters={quarters}
          buildHref={buildHref}
        />
      ) : (
        <RankingView
          groupId={groupId}
          mode={mode}
          seasonYear={seasonYear}
          seasonStartMonth={group.seasonStartMonth}
          seasonNumberOffset={group.seasonNumberOffset}
          selectedQuarter={selectedQuarter}
          quarters={quarters}
          range={range}
          playCountBonusRule={playCountBonusRule}
          buildHref={buildHref}
        />
      )}
    </div>
  );
}

async function RecordsView({
  groupId,
  selectedQuarter,
  quarters,
  buildHref,
}: {
  groupId: string;
  selectedQuarter: 1 | 2 | 3 | 4;
  quarters: ReturnType<typeof listQuarters>;
  buildHref: BuildHref;
}) {
  const range = quarters[selectedQuarter - 1];

  const tables = await prisma.table.findMany({
    where: { groupId, playedDate: { gte: range.start, lte: range.end } },
    include: {
      members: { include: { user: true }, orderBy: { seatOrder: "asc" } },
      games: { include: { results: true }, orderBy: { hanchanNumber: "asc" } },
    },
    orderBy: { playedDate: "desc" },
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {quarters.map((q) => (
          <Link
            key={q.quarter}
            href={buildHref({ view: "records", quarter: q.quarter })}
            className={`flex-1 rounded-lg border py-1.5 text-center text-sm transition-colors ${
              selectedQuarter === q.quarter
                ? "border-gold-500 bg-gold-500/10 font-semibold text-board-800"
                : "border-ink-400/20 text-ink-600"
            }`}
          >
            Q{q.quarter}
          </Link>
        ))}
      </div>

      <Link href={`/g/${groupId}/tables/new`} className="block">
        <Button variant="secondary" className="w-full">
          ＋ 新しい対局記録
        </Button>
      </Link>

      <Card className="divide-y divide-ink-400/10">
        {tables.length === 0 && (
          <p className="p-4 text-sm text-ink-400">このクォーターの対局記録はまだありません。</p>
        )}
        {tables.map((table) => {
          const members = table.members.map((m) => ({ userId: m.userId, userName: m.user.name }));
          const games = table.games.map((g) => ({
            hanchanNumber: g.hanchanNumber ?? 0,
            results: g.results.map((r) => ({
              userId: r.userId,
              totalRankingPoint: r.totalRankingPoint,
            })),
          }));
          const standings = computeTableStandings(members, games);

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
                <div className="flex items-center gap-2">
                  <Badge tone={table.status === "open" ? "gold" : "neutral"}>
                    {games.length}半荘
                  </Badge>
                  {table.status === "locked" && <Badge tone="neutral">ロック済み</Badge>}
                </div>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-ink-600">
                {standings.map((s) => (
                  <span key={s.userId}>
                    {s.userName} {s.total > 0 ? "+" : ""}
                    {s.total}
                  </span>
                ))}
              </div>
            </Link>
          );
        })}
      </Card>
    </div>
  );
}

async function RankingView({
  groupId,
  mode,
  seasonYear,
  seasonStartMonth,
  seasonNumberOffset,
  selectedQuarter,
  quarters,
  range,
  playCountBonusRule,
  buildHref,
}: {
  groupId: string;
  mode: "season" | "quarter";
  seasonYear: number;
  seasonStartMonth: number;
  seasonNumberOffset: number | null;
  selectedQuarter: 1 | 2 | 3 | 4;
  quarters: ReturnType<typeof listQuarters>;
  range: { start: Date; end: Date };
  playCountBonusRule?: PlayCountBonusRule;
  buildHref: BuildHref;
}) {
  const results = await getConfirmedGameResults(groupId);
  const ranking = calculateRanking(results, range, playCountBonusRule);

  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-full bg-ink-400/10 p-1 text-sm font-medium">
        <Link
          href={buildHref({ view: "ranking", period: "quarter" })}
          className={`flex-1 rounded-full py-2 text-center transition-colors ${
            mode === "quarter" ? "bg-washi-100 text-board-800 shadow-sm" : "text-ink-600"
          }`}
        >
          クォーター
        </Link>
        <Link
          href={buildHref({ view: "ranking", period: "season" })}
          className={`flex-1 rounded-full py-2 text-center transition-colors ${
            mode === "season" ? "bg-washi-100 text-board-800 shadow-sm" : "text-ink-600"
          }`}
        >
          年間
        </Link>
      </div>

      {mode === "quarter" && (
        <div className="flex gap-2">
          {quarters.map((q) => (
            <Link
              key={q.quarter}
              href={buildHref({ view: "ranking", period: "quarter", quarter: q.quarter })}
              className={`flex-1 rounded-lg border py-1.5 text-center text-sm transition-colors ${
                selectedQuarter === q.quarter
                  ? "border-gold-500 bg-gold-500/10 font-semibold text-board-800"
                  : "border-ink-400/20 text-ink-600"
              }`}
            >
              Q{q.quarter}
            </Link>
          ))}
        </div>
      )}

      <p className="text-xs text-ink-400">
        {mode === "season"
          ? seasonLabel(seasonYear, seasonStartMonth, seasonNumberOffset)
          : `${seasonShortLabel(seasonYear, seasonNumberOffset)} Q${selectedQuarter}`}
      </p>

      <Card className="divide-y divide-ink-400/10">
        {ranking.length === 0 && (
          <p className="p-4 text-sm text-ink-400">この期間の対局記録はまだありません。</p>
        )}
        {ranking.map((entry) => (
          <div key={entry.userId} className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="w-8 text-center text-lg">
                {MEDALS[entry.rank - 1] ?? entry.rank}
              </span>
              <div>
                <span className="block text-sm font-medium text-ink-900">{entry.userName}</span>
                <span className="block text-xs text-ink-400">
                  {entry.gamesPlayed}半荘
                  {entry.playCountBonusPoint !== 0 && (
                    <>
                      {" "}
                      ・対局数
                      {entry.playCountBonusPoint > 0 ? "ボーナス" : "ペナルティ"}
                      {entry.playCountBonusPoint > 0 ? "+" : ""}
                      {entry.playCountBonusPoint}
                    </>
                  )}
                </span>
              </div>
            </div>
            <span
              className={`text-sm font-semibold ${
                entry.totalPoint > 0
                  ? "text-board-800"
                  : entry.totalPoint < 0
                    ? "text-red-600"
                    : "text-ink-600"
              }`}
            >
              {entry.totalPoint > 0 ? "+" : ""}
              {entry.totalPoint}
            </span>
          </div>
        ))}
      </Card>
    </div>
  );
}
