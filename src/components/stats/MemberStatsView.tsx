import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getPersonalGameStats, getAvailableSeasonYears } from "@/lib/mahjong/queries";
import {
  getSeasonYear,
  getQuarterForDate,
  getSeasonRange,
  getQuarterRange,
  seasonShortLabel,
} from "@/lib/mahjong/season";
import { PlayerStatsCard } from "@/components/ui/PlayerStatsCard";

export type StatsPeriod = "all" | "season" | "q1" | "q2" | "q3" | "q4";

const PERIODS: { value: StatsPeriod; label: string }[] = [
  { value: "all", label: "通算" },
  { value: "season", label: "年間" },
  { value: "q1", label: "Q1" },
  { value: "q2", label: "Q2" },
  { value: "q3", label: "Q3" },
  { value: "q4", label: "Q4" },
];

const pill = (active: boolean) =>
  `rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
    active ? "border-gold-500 bg-gold-500/10 text-board-800" : "border-ink-400/20 text-ink-600"
  }`;

/** 指定メンバーの成績を 通算/年間/Q1〜Q4 × シーズン(期) で切り替えて表示する */
export async function MemberStatsView({
  groupId,
  userId,
  basePath,
  query,
}: {
  groupId: string;
  userId: string;
  basePath: string;
  query: { year?: string; period?: string };
}) {
  const group = await prisma.group.findUniqueOrThrow({ where: { id: groupId } });
  const now = new Date();
  const currentSeasonYear = getSeasonYear(now, group.seasonStartMonth);
  const currentQuarter = getQuarterForDate(now, group.seasonStartMonth).quarter;

  const years = await getAvailableSeasonYears(groupId, group.seasonStartMonth);
  const requestedYear = Number(query.year);
  const seasonYear = years.includes(requestedYear) ? requestedYear : currentSeasonYear;

  const period: StatsPeriod = PERIODS.some((p) => p.value === query.period)
    ? (query.period as StatsPeriod)
    : (`q${currentQuarter}` as StatsPeriod);

  const range =
    period === "all"
      ? undefined
      : period === "season"
        ? getSeasonRange(seasonYear, group.seasonStartMonth)
        : getQuarterRange(
            seasonYear,
            Number(period.slice(1)) as 1 | 2 | 3 | 4,
            group.seasonStartMonth
          );

  const stats = await getPersonalGameStats(groupId, userId, range);

  const href = (over: { year?: number; period?: StatsPeriod }) => {
    const p = over.period ?? period;
    const params = new URLSearchParams({ period: p });
    if (p !== "all") params.set("year", String(over.year ?? seasonYear));
    return `${basePath}?${params.toString()}`;
  };

  const title =
    period === "all"
      ? "通算の成績"
      : `${seasonShortLabel(seasonYear, group.seasonNumberOffset)} ${
          period === "season" ? "年間" : period.toUpperCase()
        }の成績`;

  return (
    <div className="space-y-3">
      {period !== "all" && years.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {years.map((y) => (
            <Link key={y} href={href({ year: y })} className={pill(y === seasonYear)}>
              {seasonShortLabel(y, group.seasonNumberOffset)}
            </Link>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {PERIODS.map((p) => (
          <Link key={p.value} href={href({ period: p.value })} className={pill(p.value === period)}>
            {p.label}
          </Link>
        ))}
      </div>
      <h2 className="text-sm font-semibold text-ink-900">{title}</h2>
      <PlayerStatsCard stats={stats} />
    </div>
  );
}
