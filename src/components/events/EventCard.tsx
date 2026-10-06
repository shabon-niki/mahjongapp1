import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { TableFormationDisplay } from "@/components/events/TableFormationDisplay";
import { formatDateTimeWithWeekday } from "@/lib/format";
import { getEntryPhase, ENTRY_PHASE_LABELS } from "@/lib/mahjong/eventStatus";
import type { TableFormationResult } from "@/lib/mahjong/tableFormation";
import type { Event, User, EntryStatus } from "@/generated/prisma/client";

const MY_ENTRY_STATUS_LABELS: Partial<Record<EntryStatus, string>> = {
  entered: "応募中",
  selected: "参加予定",
  played: "対局済み",
};

export function EventCard({
  event,
  organizer,
  entryCount,
  formation,
  myEntryStatus,
}: {
  event: Event;
  organizer: User;
  entryCount: number;
  formation: TableFormationResult;
  myEntryStatus?: EntryStatus | null;
}) {
  const phase = getEntryPhase(event.entryDeadline);
  const myStatusLabel = myEntryStatus ? MY_ENTRY_STATUS_LABELS[myEntryStatus] : undefined;

  return (
    <Link href={`/g/${event.groupId}/events/${event.id}`} className="block">
      <Card className="p-4 hover:border-gold-500/60 transition-colors">
        <div className="flex flex-wrap items-center gap-1.5">
          {event.status === "open" && (
            <Badge tone={phase === "closing_soon" ? "red" : phase === "closed" ? "neutral" : "green"}>
              {ENTRY_PHASE_LABELS[phase]}
            </Badge>
          )}
          {myStatusLabel && <Badge tone="gold">{myStatusLabel}</Badge>}
          {event.beginnerFriendly && <Badge tone="gold">初心者歓迎</Badge>}
        </div>

        <h3 className="mt-2 text-base font-bold text-ink-900">{event.title}</h3>
        <dl className="mt-1 space-y-0.5 text-sm text-ink-600">
          <div className="flex items-center gap-1.5">
            <span className="text-xs">📅</span>
            <dd>{formatDateTimeWithWeekday(event.eventDatetime)}</dd>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs">👤</span>
            <dt className="text-ink-400">募集者</dt>
            <dd>{organizer.name}</dd>
          </div>
        </dl>

        <div className="mt-3">
          <TableFormationDisplay entryCount={entryCount} formation={formation} />
        </div>
      </Card>
    </Link>
  );
}
