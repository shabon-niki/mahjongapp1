import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPersonalGameStats } from "@/lib/mahjong/queries";
import { getSeasonYear, getSeasonRange, seasonShortLabel } from "@/lib/mahjong/season";
import { EXPERIENCE_LABELS } from "@/lib/mahjong/experience";
import { PlayerStatsCard } from "@/components/ui/PlayerStatsCard";

export default async function MemberStatsPage({
  params,
}: {
  params: Promise<{ groupId: string; userId: string }>;
}) {
  const { groupId, userId } = await params;
  await requireMembership(groupId);

  const [group, target] = await Promise.all([
    prisma.group.findUniqueOrThrow({ where: { id: groupId } }),
    prisma.groupMembership.findUnique({
      where: { groupId_userId: { groupId, userId } },
      include: { user: true },
    }),
  ]);
  if (!target) notFound();

  const seasonYear = getSeasonYear(new Date(), group.seasonStartMonth);
  const seasonRange = getSeasonRange(seasonYear, group.seasonStartMonth);
  const [seasonStats, allTimeStats] = await Promise.all([
    getPersonalGameStats(groupId, userId, seasonRange),
    getPersonalGameStats(groupId, userId),
  ]);

  return (
    <div className="space-y-5">
      <Link href={`/g/${groupId}/ranking`} className="text-sm text-ink-400">
        ‹ ランキングに戻る
      </Link>
      <div>
        <h1 className="font-serif text-xl font-bold text-ink-900">{target.user.name}</h1>
        <p className="mt-0.5 text-sm text-ink-600">{EXPERIENCE_LABELS[target.user.experienceLevel]}</p>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-ink-900">
          今シーズンの成績({seasonShortLabel(seasonYear, group.seasonNumberOffset)})
        </h2>
        <PlayerStatsCard stats={seasonStats} />
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-ink-900">通算の成績</h2>
        <PlayerStatsCard stats={allTimeStats} />
      </div>
    </div>
  );
}
