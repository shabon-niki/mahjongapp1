import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireMembership } from "@/lib/auth";
import { getEventDetail } from "@/lib/mahjong/queries";
import { updateEvent } from "../actions";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";
import { TableCountStepper } from "@/components/events/TableCountStepper";
import { DecorativeDivider } from "@/components/ui/DecorativeDivider";

function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ groupId: string; id: string }>;
}) {
  const { groupId, id } = await params;
  const { user, membership } = await requireMembership(groupId);

  const event = await getEventDetail(groupId, id);
  if (!event) notFound();
  if (event.organizerUserId !== user.id && membership.role !== "owner") {
    redirect(`/g/${groupId}/events/${id}`);
  }

  return (
    <div className="space-y-4">
      <div className="-mx-4 -mt-5 bg-board-800 px-4 pt-5 pb-6 text-washi-100">
        <div className="flex items-center justify-between">
          <Link href={`/g/${groupId}/events/${id}`} className="text-xl leading-none">
            ‹
          </Link>
          <h1 className="font-serif text-base font-bold tracking-wide">募集を編集する</h1>
          <span className="w-5" />
        </div>
        <DecorativeDivider className="mt-3" />
      </div>

      <Card className="p-4">
        <form action={updateEvent.bind(null, groupId, id)} className="space-y-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-900">開催タイトル</label>
            <input
              name="title"
              required
              defaultValue={event.title}
              className="w-full rounded-lg border border-ink-400/30 bg-washi-100 px-3 py-2 text-sm outline-none focus:border-gold-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-ink-900">開催日時</label>
            <input
              type="datetime-local"
              name="eventDatetime"
              required
              defaultValue={toLocalInputValue(event.eventDatetime)}
              className="w-full rounded-lg border border-ink-400/30 bg-washi-100 px-3 py-2 text-sm outline-none focus:border-gold-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-ink-900">エントリー締切</label>
            <input
              type="datetime-local"
              name="entryDeadline"
              required
              defaultValue={toLocalInputValue(event.entryDeadline)}
              className="w-full rounded-lg border border-ink-400/30 bg-washi-100 px-3 py-2 text-sm outline-none focus:border-gold-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-ink-900">最大卓数</label>
            <TableCountStepper name="maxTables" defaultValue={event.maxTables} />
          </div>

          <div className="border-t border-ink-400/10 pt-4">
            <Toggle
              name="beginnerFriendly"
              label="初心者歓迎"
              description="役や点数に自信がなくても参加OK！"
              defaultChecked={event.beginnerFriendly}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-ink-900">メモ・補足</label>
            <textarea
              name="note"
              rows={3}
              defaultValue={event.note ?? ""}
              placeholder="例) 20時半頃までの予定です"
              className="w-full rounded-lg border border-ink-400/30 bg-washi-100 px-3 py-2 text-sm outline-none focus:border-gold-500"
            />
          </div>

          <Button type="submit" variant="primary" className="w-full">
            この内容で保存する
          </Button>
        </form>
      </Card>
    </div>
  );
}
