"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteEvent } from "@/app/g/[groupId]/events/[id]/actions";
import { Button } from "@/components/ui/Button";

export function DeleteEventButton({ groupId, eventId }: { groupId: string; eventId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  if (!confirming) {
    return (
      <Button variant="ghost" className="w-full text-red-600" onClick={() => setConfirming(true)}>
        この募集を削除する
      </Button>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-red-600">
        この募集を削除します。この操作は元に戻せません。対局記録が紐づいている場合は削除できません。
      </p>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <Button
        variant="ghost"
        className="w-full text-red-600"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            try {
              await deleteEvent(groupId, eventId);
              router.push(`/g/${groupId}`);
            } catch (e) {
              setError(e instanceof Error ? e.message : "削除に失敗しました");
            }
          })
        }
      >
        {isPending ? "削除中..." : "削除する"}
      </Button>
      <Button
        variant="ghost"
        className="w-full"
        disabled={isPending}
        onClick={() => {
          setConfirming(false);
          setError(null);
        }}
      >
        キャンセル
      </Button>
    </div>
  );
}
