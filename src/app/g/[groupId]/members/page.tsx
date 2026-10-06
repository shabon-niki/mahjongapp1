import Link from "next/link";
import { requireMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EXPERIENCE_LABELS } from "@/lib/mahjong/experience";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { InviteLinkCard } from "@/components/groups/InviteLinkCard";

export default async function MembersPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const { membership } = await requireMembership(groupId);

  const group = await prisma.group.findUniqueOrThrow({ where: { id: groupId } });
  const memberships = await prisma.groupMembership.findMany({
    where: { groupId },
    include: { user: true },
    orderBy: { joinedAt: "asc" },
  });

  const isOwner = membership.role === "owner";

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-serif text-lg font-bold text-ink-900">メンバー</h1>
        <p className="mt-1 text-sm text-ink-600">{group.name} ・ {memberships.length}人</p>
      </div>

      <InviteLinkCard groupId={groupId} inviteToken={group.inviteToken} isOwner={isOwner} />

      <Card className="divide-y divide-ink-400/10">
        {memberships.map((m) => (
          <div key={m.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
            <div>
              <Link
                href={`/g/${groupId}/members/${m.userId}`}
                className="text-ink-900 underline decoration-ink-400/30 underline-offset-2"
              >
                {m.user.name}
              </Link>
              <span className="ml-2 text-xs text-ink-400">
                {EXPERIENCE_LABELS[m.user.experienceLevel]}
              </span>
            </div>
            {m.role === "owner" && <Badge tone="gold">オーナー</Badge>}
          </div>
        ))}
      </Card>

      {isOwner && (
        <Link href={`/g/${groupId}/settings`} className="block text-center text-sm text-board-800 underline underline-offset-2">
          麻雀ルールを設定する
        </Link>
      )}
    </div>
  );
}
