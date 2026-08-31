"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { finalizeParticipants } from "@/app/g/[groupId]/events/[id]/actions";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { RecommendationResult } from "@/lib/mahjong/recommendation";

export function FinalizeForm({
  groupId,
  eventId,
  neededCount,
  recommended,
  others,
}: {
  groupId: string;
  eventId: string;
  neededCount: number;
  recommended: RecommendationResult[];
  others: RecommendationResult[];
}) {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(recommended.map((r) => r.userId))
  );
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  const all = [...recommended, ...others];

  const handleCopyMentions = async () => {
    const names = all.filter((r) => selected.has(r.userId)).map((r) => `@${r.userName}`);
    const eventUrl = `${window.location.origin}/g/${groupId}/events/${eventId}`;
    const text = `${names.join(" ")}\n今回の卓に選ばれました！よろしくお願いします 🀄\n${eventUrl}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggle = (userId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-600">
        今回選ぶ人数: <span className="font-semibold text-ink-900">{neededCount}人</span>
        (最終判断は募集者が自由に変更できます)
      </p>

      <Card className="divide-y divide-ink-400/10">
        {all.map((r) => {
          const isRecommended = recommended.some((x) => x.userId === r.userId);
          return (
            <label
              key={r.userId}
              className="flex cursor-pointer items-start gap-3 px-4 py-3"
            >
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 accent-gold-500"
                checked={selected.has(r.userId)}
                onChange={() => toggle(r.userId)}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-ink-900">{r.userName}</span>
                  {isRecommended && <Badge tone="gold">おすすめ</Badge>}
                </div>
                <ul className="mt-0.5 space-y-0.5 text-xs text-ink-600">
                  {r.reasons.map((reason, i) => (
                    <li key={i}>・{reason}</li>
                  ))}
                </ul>
              </div>
            </label>
          );
        })}
      </Card>

      <p className="text-xs text-ink-400">選択中: {selected.size}人</p>

      <Button
        type="button"
        variant="ghost"
        className="w-full"
        disabled={selected.size === 0}
        onClick={handleCopyMentions}
      >
        {copied ? "コピーしました！" : "選んだ人へのメンションをコピー(Teams貼り付け用)"}
      </Button>

      <Button
        variant="secondary"
        className="w-full"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            await finalizeParticipants(groupId, eventId, Array.from(selected));
            router.push(`/g/${groupId}/events/${eventId}`);
          })
        }
      >
        {isPending ? "確定中..." : "この内容で参加者を確定する"}
      </Button>
    </div>
  );
}
