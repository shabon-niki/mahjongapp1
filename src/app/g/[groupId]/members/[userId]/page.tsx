import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EXPERIENCE_LABELS } from "@/lib/mahjong/experience";
import { MemberStatsView } from "@/components/stats/MemberStatsView";

export default async function MemberStatsPage({
  params,
  searchParams,
}: {
  params: Promise<{ groupId: string; userId: string }>;
  searchParams: Promise<{ year?: string; period?: string }>;
}) {
  const { groupId, userId } = await params;
  const query = await searchParams;
  await requireMembership(groupId);

  const target = await prisma.groupMembership.findUnique({
    where: { groupId_userId: { groupId, userId } },
    include: { user: true },
  });
  if (!target) notFound();

  return (
    <div className="space-y-5">
      <Link href={`/g/${groupId}/ranking`} className="text-sm text-ink-400">
        ‹ ランキングに戻る
      </Link>
      <div>
        <h1 className="font-serif text-xl font-bold text-ink-900">{target.user.name}</h1>
        <p className="mt-0.5 text-sm text-ink-600">{EXPERIENCE_LABELS[target.user.experienceLevel]}</p>
      </div>

      <MemberStatsView
        groupId={groupId}
        userId={userId}
        basePath={`/g/${groupId}/members/${userId}`}
        query={query}
      />
    </div>
  );
}
