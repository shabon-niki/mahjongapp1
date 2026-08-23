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
} from "@/lib/mahjong/season";
import { formatDate } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

const MEDALS = ["🥇", "🥈", "🥉"];

export default async function RankingPage({
  params,
  searchParams,
}: {
  params: Promise<{ groupId: string }>;
  searchParams: Promise<{ view?: string; period?: string; quarter?: string }>;
}) {
  const { groupId } = await params;
  await requireMembership(groupId);
  const group = await prisma.group.findUniqueOrThrow({
    where: { id: groupId },
    include: { rule: true },
  });
  const playCountBonusRule = group.rule ? toPlayCountBonusRule(group.rule) : undefined;

  const { view, period, quarter } = await searchParams;
  const now = new Date();
  const seasonYear = getSeasonYear(now, group.seasonStartMonth);
  const currentQuarter = getQuarterForDate(now, group.seasonStartMonth).quarter;

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

  return (
    <div className="space-y-5">
      <h1 className="font-serif text-lg font-bold text-ink-900">
        {activeView === "records" ? "対局記録" : "ランキング"}
      </h1>

      <div className="flex gap-1 rounded-full bg-ink-400/10 p-1 text-sm font-medium">
        <Link
          href={`/g/${groupId}/ranking?view=records`}
          className={`flex-1 rounded-full py-2 text-center transition-colors ${
            activeView === "records" ? "bg-washi-100 text-board-800 shadow-sm" : "text-ink-600"
          }`}
        >
          対局記録
        </Link>
        <Link
          href={`/g/${groupId}/ranking?view=ranking`}
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
        />
      ) : (
        <RankingView
          groupId={groupId}
          mode={mode}
          seasonYear={seasonYear}
          seasonStartMonth={group.seasonStartMonth}
          selectedQuarter={selectedQuarter}
          quarters={quarters}
          range={range}
          playCountBonusRule={playCountBonusRule}
        />
      )}
    </div>
  );
}

async function RecordsView({
  groupId,
  selectedQuarter,
  quarters,
}: {
  groupId: string;
  selectedQuarter: 1 | 2 | 3 | 4;
  quarters: ReturnType<typeof listQuarters>;
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
            href={`/g/${groupId}/ranking?view=records&quarter=${q.quarter}`}
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
  selectedQuarter,
  quarters,
  range,
  playCountBonusRule,
}: {
  groupId: string;
  mode: "season" | "quarter";
  seasonYear: number;
  seasonStartMonth: number;
  selectedQuarter: 1 | 2 | 3 | 4;
  quarters: ReturnType<typeof listQuarters>;
  range: { start: Date; end: Date };
  playCountBonusRule?: PlayCountBonusRule;
}) {
  const results = await getConfirmedGameResults(groupId);
  const ranking = calculateRanking(results, range, playCountBonusRule);

  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-full bg-ink-400/10 p-1 text-sm font-medium">
        <Link
          href={`/g/${groupId}/ranking?view=ranking&period=quarter`}
          className={`flex-1 rounded-full py-2 text-center transition-colors ${
            mode === "quarter" ? "bg-washi-100 text-board-800 shadow-sm" : "text-ink-600"
          }`}
        >
          クォーター
        </Link>
        <Link
          href={`/g/${groupId}/ranking?view=ranking&period=season`}
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
              href={`/g/${groupId}/ranking?view=ranking&period=quarter&quarter=${q.quarter}`}
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
          ? seasonLabel(seasonYear, seasonStartMonth)
          : quarters[selectedQuarter - 1].label}
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
