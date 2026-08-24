"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CURRENT_USER_COOKIE, PENDING_INVITE_COOKIE } from "@/lib/auth";
import { hashPassword, verifyPassword, isValidEmail, isValidPassword } from "@/lib/password";

const SESSION_COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 60 * 60 * 24 * 365,
  path: "/",
};

/** ログイン後の遷移先を決める。招待リンク経由なら招待ページへ、それ以外はGroup一覧へ。 */
async function resolveDestination(): Promise<string> {
  const cookieStore = await cookies();
  const pendingInvite = cookieStore.get(PENDING_INVITE_COOKIE)?.value;
  if (pendingInvite) {
    cookieStore.delete(PENDING_INVITE_COOKIE);
    return `/invite/${pendingInvite}`;
  }
  return "/groups";
}

async function loginAs(userId: string) {
  const cookieStore = await cookies();
  cookieStore.set(CURRENT_USER_COOKIE, userId, SESSION_COOKIE_OPTS);
  redirect(await resolveDestination());
}

export type LoginFormState = { error?: string };

export async function login(
  _prevState: LoginFormState,
  formData: FormData
): Promise<LoginFormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const user = await prisma.user.findUnique({ where: { email } });
  // メール未登録とパスワード不一致を区別しない(アカウント在否の推測を防ぐ)
  if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
    return { error: "メールアドレスまたはパスワードが違います" };
  }

  await loginAs(user.id);
  return {};
}

export type RegisterFormState = { error?: string };

export async function register(
  _prevState: RegisterFormState,
  formData: FormData
): Promise<RegisterFormState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const experienceLevel = formData.get("experienceLevel");
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("passwordConfirm") ?? "");

  if (!name) return { error: "お名前を入力してください" };
  if (!isValidEmail(email)) return { error: "メールアドレスの形式が正しくありません" };
  if (
    typeof experienceLevel !== "string" ||
    !["inexperienced", "beginner", "experienced"].includes(experienceLevel)
  ) {
    return { error: "経験レベルを選択してください" };
  }
  if (!isValidPassword(password)) {
    return { error: "パスワードは8文字以上で入力してください" };
  }
  if (password !== passwordConfirm) {
    return { error: "確認用パスワードが一致しません" };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "このメールアドレスは既に登録されています" };
  }

  const user = await prisma.user.create({
    data: {
      name,
      email,
      experienceLevel: experienceLevel as "inexperienced" | "beginner" | "experienced",
      passwordHash: hashPassword(password),
    },
  });

  await loginAs(user.id);
  return {};
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(CURRENT_USER_COOKIE);
  redirect("/login");
}
