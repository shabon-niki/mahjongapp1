import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Card } from "@/components/ui/Card";
import { DeleteAccountForm } from "@/components/account/DeleteAccountForm";

export default async function DeleteAccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-dvh bg-washi-200 flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm space-y-5">
        <div>
          <h1 className="font-serif text-lg font-bold text-ink-900">アカウントを削除する</h1>
          <p className="mt-2 text-sm text-ink-600">
            {user.name} さんのアカウント({user.email})を削除します。この操作は取り消せません。
          </p>
        </div>

        <Card className="p-4 space-y-2 text-sm text-ink-600">
          <p>・ログインできなくなり、メールアドレス・パスワードは削除されます</p>
          <p>・参加していたすべての麻雀部から抜けます</p>
          <p>
            ・過去の対局結果・ランキングは、他のメンバーの記録と一体のため削除されません
            (お名前のみ記録に残ります)
          </p>
          <p>
            ・オーナーになっている麻雀部がある場合、他のメンバーがいれば
            加入日が最も古いメンバーに自動的にオーナー権限が移ります
          </p>
        </Card>

        <Card className="p-4">
          <DeleteAccountForm />
        </Card>

        <Link href="/groups" className="block text-center text-sm text-ink-400 underline">
          キャンセルして戻る
        </Link>
      </div>
    </div>
  );
}
