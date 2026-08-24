import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { User, GroupMembership } from "@/generated/prisma/client";

/**
 * メールアドレス+パスワード方式の認証層。
 *
 * 将来的に別の認証基盤に差し替える場合でも、この関数の中身だけを
 * 差し替えれば済むように、アプリの他の部分は getCurrentUser() /
 * requireMembership() 経由でのみユーザー・Groupを参照する。
 */
const CURRENT_USER_COOKIE = "atsumare_user_id";
/** 未ログイン状態で招待リンクを開いた場合に、ログイン後の遷移先を覚えておくためのCookie */
const PENDING_INVITE_COOKIE = "atsumare_pending_invite";

export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const userId = cookieStore.get(CURRENT_USER_COOKIE)?.value;
  if (!userId) return null;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.deletedAt) return null;
  return user;
}

export async function getCurrentUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(CURRENT_USER_COOKIE)?.value ?? null;
}

/** userIdが指定Groupのメンバーかどうかを返す(他Groupのデータ漏洩防止の根幹) */
export async function getMembership(
  groupId: string,
  userId: string
): Promise<GroupMembership | null> {
  return prisma.groupMembership.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });
}

/**
 * ログイン済み かつ 指定Groupのメンバーであることを要求する。
 * 満たさない場合はredirectする(ページ/レイアウトから呼ぶこと)。
 */
export async function requireMembership(
  groupId: string
): Promise<{ user: User; membership: GroupMembership }> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const membership = await getMembership(groupId, user.id);
  if (!membership) redirect("/groups");

  return { user, membership };
}

/** Owner権限を要求する(Group設定・メンバー管理・ルール変更用) */
export async function requireOwner(
  groupId: string
): Promise<{ user: User; membership: GroupMembership }> {
  const { user, membership } = await requireMembership(groupId);
  if (membership.role !== "owner") redirect(`/g/${groupId}`);
  return { user, membership };
}

export async function listMyGroups(userId: string) {
  return prisma.groupMembership.findMany({
    where: { userId },
    include: { group: true },
    orderBy: { joinedAt: "asc" },
  });
}

export { CURRENT_USER_COOKIE, PENDING_INVITE_COOKIE };
