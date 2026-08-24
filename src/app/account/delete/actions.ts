"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, CURRENT_USER_COOKIE } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";

export type DeleteAccountFormState = { error?: string };

/**
 * アカウント削除(Apple App Storeガイドライン5.1.1(v)対応)。
 *
 * 他メンバーと共有される対局結果・ランキング履歴は削除せず(他メンバーの
 * データと不可分のため)、本人のログイン手段(email/passwordHash)を消し、
 * 全Groupのメンバーシップを外すことで「退会」を表現する(仕様外の追加対応)。
 * オーナーだったGroupは、他のメンバーがいれば加入日が古い順に譲渡する。
 */
export async function deleteAccount(
  _prevState: DeleteAccountFormState,
  formData: FormData
): Promise<DeleteAccountFormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const password = String(formData.get("password") ?? "");
  if (!user.passwordHash || !verifyPassword(password, user.passwordHash)) {
    return { error: "パスワードが正しくありません" };
  }

  await prisma.$transaction(async (tx) => {
    const ownedGroups = await tx.group.findMany({ where: { ownerUserId: user.id } });

    for (const group of ownedGroups) {
      const nextOwner = await tx.groupMembership.findFirst({
        where: { groupId: group.id, userId: { not: user.id } },
        orderBy: { joinedAt: "asc" },
      });
      if (nextOwner) {
        await tx.group.update({
          where: { id: group.id },
          data: { ownerUserId: nextOwner.userId },
        });
        await tx.groupMembership.update({
          where: { id: nextOwner.id },
          data: { role: "owner" },
        });
      }
      // 他に譲渡先がいない(本人のみのGroup)場合はownerUserIdをそのままにする。
      // 本人のメンバーシップはこの後削除されるため誰もアクセスできなくなるが、
      // 過去の対局記録・ランキングは保持される。
    }

    await tx.groupMembership.deleteMany({ where: { userId: user.id } });

    await tx.user.update({
      where: { id: user.id },
      data: { email: null, passwordHash: null, deletedAt: new Date() },
    });
  });

  const cookieStore = await cookies();
  cookieStore.delete(CURRENT_USER_COOKIE);
  redirect("/login?deleted=1");
}
