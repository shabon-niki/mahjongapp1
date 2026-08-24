"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import { regenerateInviteToken } from "@/app/groups/actions";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export function InviteLinkCard({
  groupId,
  inviteToken,
  isOwner,
}: {
  groupId: string;
  inviteToken: string;
  isOwner: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // navigator.shareの有無はSSR時に判定できないため、クライアントでのみ読み取る
  // (useSyncExternalStoreならハイドレーション不整合の警告を避けられる)
  const canShare = useSyncExternalStore(
    () => () => {},
    () => typeof navigator !== "undefined" && "share" in navigator,
    () => false
  );

  const inviteUrl = () => `${window.location.origin}/invite/${inviteToken}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(inviteUrl());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    try {
      await navigator.share({ title: "聴牌", text: "麻雀部に招待されました", url: inviteUrl() });
    } catch {
      // ユーザーによる共有キャンセル等は無視する
    }
  };

  return (
    <Card className="p-4 space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-ink-900">メンバーを招待</h2>
        <p className="mt-1 text-xs text-ink-600">
          リンクをコピーしてTeams等へ共有してください。リンクを開いた人はログイン後、参加確認画面が表示されます。
        </p>
      </div>
      {canShare && (
        <Button variant="secondary" className="w-full" onClick={handleShare}>
          招待リンクを共有
        </Button>
      )}
      <Button variant={canShare ? "ghost" : "secondary"} className="w-full" onClick={handleCopy}>
        {copied ? "コピーしました！" : "招待リンクをコピー"}
      </Button>
      {isOwner && (
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              await regenerateInviteToken(groupId);
              router.refresh();
            })
          }
          className="w-full text-center text-xs text-ink-400 underline underline-offset-2 cursor-pointer"
        >
          {isPending ? "再発行中..." : "招待リンクを再発行する(古いリンクは無効になります)"}
        </button>
      )}
    </Card>
  );
}
