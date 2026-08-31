import { requireMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { PushRegistrar } from "@/components/push/PushRegistrar";

export default async function GroupLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const { user } = await requireMembership(groupId);

  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group) notFound();

  return (
    <div className="flex min-h-dvh flex-col bg-washi-200">
      <PushRegistrar />
      <Header user={user} groupName={group.name} groupId={groupId} />
      <main className="mx-auto w-full max-w-xl flex-1 px-4 py-5">{children}</main>
      <BottomNav groupId={groupId} />
    </div>
  );
}
