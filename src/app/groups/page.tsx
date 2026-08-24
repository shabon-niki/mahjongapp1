import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getCurrentUser, listMyGroups } from "@/lib/auth";
import { logout } from "@/app/login/actions";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default async function GroupsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const memberships = await listMyGroups(user.id);

  if (memberships.length === 1) {
    redirect(`/g/${memberships[0].groupId}`);
  }

  return (
    <div className="min-h-dvh bg-board-900 px-4 py-10">
      <div className="mx-auto w-full max-w-sm space-y-6">
        <div className="text-center text-washi-100">
          <span className="mx-auto flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl border border-gold-400/60 shadow-sm">
            <Image src="/logo.png" alt="聴牌" width={56} height={56} className="h-full w-full object-cover" />
          </span>
          <h1 className="font-serif mt-3 text-xl font-bold tracking-wide">聴牌</h1>
          <p className="mt-1 text-sm text-washi-200/70">
            {user.name} さんが参加している麻雀部
          </p>
        </div>

        <Card className="divide-y divide-ink-400/10">
          {memberships.length === 0 && (
            <p className="p-4 text-sm text-ink-600">
              まだどの麻雀部にも参加していません。新しく作るか、招待リンクから参加してください。
            </p>
          )}
          {memberships.map((m) => (
            <Link
              key={m.groupId}
              href={`/g/${m.groupId}`}
              className="flex items-center justify-between px-4 py-3 hover:bg-gold-500/10 transition-colors"
            >
              <span className="font-medium text-ink-900">{m.group.name}</span>
              <span className="text-xs text-ink-400">
                {m.role === "owner" ? "オーナー" : "メンバー"}
              </span>
            </Link>
          ))}
        </Card>

        <Link href="/groups/new" className="block">
          <Button variant="cream" className="w-full">
            ＋ 新しい麻雀部を作る
          </Button>
        </Link>

        <div className="flex items-center justify-center gap-4">
          <form action={logout}>
            <button
              type="submit"
              className="text-xs text-washi-200/60 underline underline-offset-2 cursor-pointer"
            >
              別のアカウントに切り替える
            </button>
          </form>
          <Link
            href="/account/delete"
            className="text-xs text-washi-200/60 underline underline-offset-2"
          >
            アカウントを削除する
          </Link>
        </div>
      </div>
    </div>
  );
}
