"use server";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** スマホアプリからプッシュ通知の端末トークンを登録する(ログイン中のユーザーに紐づく) */
export async function registerPushToken(token: string, platform: "ios" | "android") {
  const user = await getCurrentUser();
  if (!user) return;

  await prisma.pushToken.upsert({
    where: { token },
    update: { userId: user.id, platform },
    create: { token, platform, userId: user.id },
  });
}

/** ログアウト時などに端末トークンの登録を解除する */
export async function unregisterPushToken(token: string) {
  await prisma.pushToken.deleteMany({ where: { token } });
}
