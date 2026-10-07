import Link from "next/link";
import { requireMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getConfirmedGameResults,
  getPersonalGameStats,
} from "@/lib/mahjong/queries";
import { calculateRanking, toPlayCountBonusRule } from "@/lib/mahjong/ranking";
import { getSeasonYear, getQuarterForDate, getSeasonRange, getQuarterRange } from "@/lib/mahjong/season";
import { EXPERIENCE_LABELS } from "@/lib/mahjong/experience";
import { Card } from "@/components/ui/Card";
import { PlayerStatsCard } from "@/components/ui/PlayerStatsCard";

export default async function MyPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const { user } = await requireMembership(groupId);
  const group = await prisma.group.findUniqueOrThrow({
    where: { id: groupId },
    include: { rule: true },
  });
  const playCountBonusRule = group.rule ? toPlayCountBonusRule(group.rule) : undefined;
  const now = new Date();
  const seasonYear = getSeasonYear(now, group.seasonStartMonth);
  const currentQuarter = getQuarterForDate(now, group.seasonStartMonth).quarter;
  const seasonRange = getSeasonRange(seasonYear, group.seasonStartMonth);
  const quarterRange = getQuarterRange(seasonYear, currentQuarter, group.seasonStartMonth);

  const results = await getConfirmedGameResults(groupId);
  const seasonRanking = calculateRanking(results, seasonRange, playCountBonusRule);
  const quarterRanking = calculateRanking(results, quarterRange, playCountBonusRule);

  const seasonEntry = seasonRanking.find((r) => r.userId === user.id);
  const quarterEntry = quarterRanking.find((r) => r.userId === user.id);

  const seasonPersonal = await getPersonalGameStats(groupId, user.id, seasonRange);
  const allTimePersonal = await getPersonalGameStats(groupId, user.id);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-serif text-xl font-bold text-ink-900">{user.name}</h1>
        <p className="mt-0.5 text-sm text-ink-600">{EXPERIENCE_LABELS[user.experienceLevel]}</p>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-ink-900">ランキング</h2>
        <Card className="divide-y divide-ink-400/10">
          <Row
            label="年間順位"
            value={
              seasonEntry
                ? `${seasonEntry.rank}位 (${seasonEntry.totalPoint > 0 ? "+" : ""}${seasonEntry.totalPoint})`
                : "記録なし"
            }
          />
          <Row
            label={`現在Q${currentQuarter}順位`}
            value={
              quarterEntry
                ? `${quarterEntry.rank}位 (${quarterEntry.totalPoint > 0 ? "+" : ""}${quarterEntry.totalPoint})`
                : "記録なし"
            }
          />
        </Card>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-ink-900">アカウント</h2>
        <Card className="divide-y divide-ink-400/10">
          <Link
            href="/account/delete"
            className="flex items-center justify-between px-4 py-3 text-sm hover:bg-gold-500/5"
          >
            <span className="text-red-600">アカウントを削除する</span>
            <span className="text-ink-400">›</span>
          </Link>
        </Card>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-ink-900">今シーズンの成績</h2>
        <PlayerStatsCard stats={seasonPersonal} />
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-ink-900">通算の成績</h2>
        <PlayerStatsCard stats={allTimePersonal} />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 text-sm">
      <span className="text-ink-400">{label}</span>
      <span className="font-medium text-ink-900">{value}</span>
    </div>
  );
}
