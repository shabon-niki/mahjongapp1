import Image from "next/image";
import { Card } from "@/components/ui/Card";
import { LoginForm } from "@/components/login/LoginForm";
import { CreateAccountForm } from "@/components/login/CreateAccountForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string }>;
}) {
  const { deleted } = await searchParams;

  return (
    <div className="min-h-dvh bg-board-900 flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center text-washi-100">
          <span className="mx-auto flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl border border-gold-400/60 shadow-sm">
            <Image src="/logo.png" alt="聴牌" width={56} height={56} className="h-full w-full object-cover" />
          </span>
          <h1 className="font-serif mt-3 text-xl font-bold tracking-wide">聴牌</h1>
          <p className="mt-1 text-sm text-washi-200/70">
            メールアドレスとパスワードでログインしてください
          </p>
        </div>

        {deleted === "1" && (
          <p className="rounded-lg bg-washi-100 px-3 py-2.5 text-center text-sm text-ink-900">
            アカウントを削除しました。ご利用ありがとうございました。
          </p>
        )}

        <Card className="p-4">
          <LoginForm />
        </Card>

        <Card className="p-4">
          <p className="mb-3 text-sm font-semibold text-ink-900">はじめての方はこちら</p>
          <CreateAccountForm />
        </Card>
      </div>
    </div>
  );
}
