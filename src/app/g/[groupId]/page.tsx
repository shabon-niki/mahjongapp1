import Link from "next/link";
import { listOpenEvents, listPastEvents } from "@/lib/mahjong/queries";
import { EventCard } from "@/components/events/EventCard";
import { Button } from "@/components/ui/Button";
import { requireMembership } from "@/lib/auth";

export default async function GroupHomePage({
  params,
  searchParams,
}: {
  params: Promise<{ groupId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { groupId } = await params;
  const { user } = await requireMembership(groupId);

  const { tab } = await searchParams;
  const activeTab = tab === "past" ? "past" : "open";

  const openEvents = activeTab === "open" ? await listOpenEvents(groupId, user.id) : [];
  const pastEvents = activeTab === "past" ? await listPastEvents(groupId, user.id) : [];

  return (
    <div className="space-y-5">
      <div className="-mx-4 -mt-5 bg-board-800 px-4 pt-5 pb-5 text-washi-100">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-serif text-lg font-bold">次の一局、誰と打つ？</h1>
            <p className="mt-0.5 text-sm text-washi-200/70">気になる卓に参加してみましょう</p>
          </div>
          <Link href={`/g/${groupId}/events/new`} className="shrink-0">
            <Button variant="cream" className="whitespace-nowrap">
              ＋ 卓を立てる
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex gap-6 border-b border-ink-400/15 text-sm font-medium">
        <Link
          href={`/g/${groupId}?tab=open`}
          className={`-mb-px border-b-2 pb-2.5 transition-colors ${
            activeTab === "open"
              ? "border-board-800 font-bold text-board-800"
              : "border-transparent text-ink-400"
          }`}
        >
          募集中の卓
        </Link>
        <Link
          href={`/g/${groupId}?tab=past`}
          className={`-mb-px border-b-2 pb-2.5 transition-colors ${
            activeTab === "past"
              ? "border-board-800 font-bold text-board-800"
              : "border-transparent text-ink-400"
          }`}
        >
          過去の卓
        </Link>
      </div>

      {activeTab === "open" && (
        <div className="space-y-3">
          {openEvents.length === 0 && (
            <p className="py-10 text-center text-sm text-ink-400">
              現在募集中の卓はありません。最初の卓を立ててみませんか？
            </p>
          )}
          {openEvents.map(({ event, entryCount, formation, myEntryStatus }) => (
            <EventCard
              key={event.id}
              event={event}
              organizer={event.organizer}
              entryCount={entryCount}
              formation={formation}
              myEntryStatus={myEntryStatus}
            />
          ))}
        </div>
      )}

      {activeTab === "past" && (
        <div className="space-y-3">
          {pastEvents.length === 0 && (
            <p className="py-10 text-center text-sm text-ink-400">過去の卓はまだありません。</p>
          )}
          {pastEvents.map(({ event, entryCount, formation, myEntryStatus }) => (
            <EventCard
              key={event.id}
              event={event}
              organizer={event.organizer}
              entryCount={entryCount}
              formation={formation}
              myEntryStatus={myEntryStatus}
            />
          ))}
        </div>
      )}
    </div>
  );
}
