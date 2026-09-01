import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getEventDetail, summarizeEntries, getParticipantStats } from "@/lib/mahjong/queries";
import { computeTableFormation, needsParticipantSelection } from "@/lib/mahjong/tableFormation";
import { buildParticipationStatusMessage } from "@/lib/mahjong/recommendation";
import { getEntryPhase, ENTRY_PHASE_LABELS } from "@/lib/mahjong/eventStatus";
import { formatDateTime } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { TableFormationDisplay } from "@/components/events/TableFormationDisplay";
import { CopyRecruitmentButton } from "@/components/events/CopyRecruitmentButton";
import { EntryActionButton } from "@/components/events/EntryActionButton";
import { DeleteEventButton } from "@/components/events/DeleteEventButton";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ groupId: string; id: string }>;
}) {
  const { groupId, id } = await params;
  const { user, membership } = await requireMembership(groupId);

  const [event, groupRule] = await Promise.all([
    getEventDetail(groupId, id),
    prisma.groupRule.findUnique({ where: { groupId } }),
  ]);
  if (!event) notFound();

  const { entryCount, validEntries } = summarizeEntries(event.entries);
  const formation = computeTableFormation(entryCount, event.maxTables);
  const phase = getEntryPhase(event.entryDeadline);

  const myEntry = event.entries.find((e) => e.userId === user.id);
  const isEnteredNow = myEntry ? ["entered", "selected", "played"].includes(myEntry.status) : false;

  const stats = await getParticipantStats(user.id, groupId, event.id);
  const statusMessage = buildParticipationStatusMessage(stats);

  const isOrganizer = event.organizerUserId === user.id;
  const deadlinePassed = new Date() > event.entryDeadline;
  const requiresAdjustment = needsParticipantSelection(entryCount, event.maxTables);
  const canRecordResults =
    membership.role === "owner" || groupRule?.resultEntryPermission !== "owner_only";
  const canRecordGame =
    canRecordResults &&
    (event.status === "finalized" ||
      (event.status === "open" && !requiresAdjustment && entryCount > 0));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge tone={phase === "closing_soon" ? "red" : phase === "closed" ? "neutral" : "green"}>
          {ENTRY_PHASE_LABELS[phase]}
        </Badge>
        {event.beginnerFriendly && <Badge tone="gold">初心者歓迎</Badge>}
      </div>

      <div>
        <h1 className="font-serif text-xl font-bold text-ink-900">{event.title}</h1>
        <dl className="mt-2 space-y-1 text-sm text-ink-600">
          <div className="flex gap-2">
            <dt className="w-20 shrink-0 text-ink-400">開催日時</dt>
            <dd>{formatDateTime(event.eventDatetime)}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-20 shrink-0 text-ink-400">エントリー締切</dt>
            <dd>{formatDateTime(event.entryDeadline)}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-20 shrink-0 text-ink-400">募集者</dt>
            <dd>{event.organizer.name}</dd>
          </div>
          {event.note && (
            <div className="flex gap-2">
              <dt className="w-20 shrink-0 text-ink-400">メモ</dt>
              <dd className="whitespace-pre-wrap">{event.note}</dd>
            </div>
          )}
        </dl>
      </div>

      <Card className="p-4">
        <TableFormationDisplay entryCount={entryCount} formation={formation} />
      </Card>

      {!isEnteredNow && (
        <Card className="p-4 border-gold-500/50 bg-gold-500/5">
          <p className="text-sm text-ink-900">{statusMessage.message}</p>
        </Card>
      )}

      <div>
        {isEnteredNow ? (
          <EntryActionButton
            groupId={groupId}
            eventId={event.id}
            mode="cancel"
            disabled={myEntry?.status === "played"}
          />
        ) : (
          <EntryActionButton groupId={groupId} eventId={event.id} mode="enter" />
        )}
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-ink-900">
          参加希望メンバー ({validEntries.length}人)
        </h2>
        <Card className="divide-y divide-ink-400/10">
          {validEntries.length === 0 && (
            <p className="p-4 text-sm text-ink-400">まだ参加希望がいません。</p>
          )}
          {validEntries.map((e) => (
            <div key={e.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span className="text-ink-900">{e.user.name}</span>
              {e.status === "selected" && <Badge tone="green">選定済み</Badge>}
              {e.status === "played" && <Badge tone="neutral">対局済み</Badge>}
            </div>
          ))}
        </Card>
      </div>

      {canRecordGame && (
        <Link href={`/g/${groupId}/games/new?eventId=${event.id}`} className="block">
          <Button variant="primary" className="w-full">
            対局を記録する
          </Button>
        </Link>
      )}

      {event.games.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold text-ink-900">この募集の対局</h2>
          <Card className="divide-y divide-ink-400/10">
            {event.games.map((g) => (
              <Link
                key={g.id}
                href={`/g/${groupId}/games/${g.id}`}
                className="flex items-center justify-between px-4 py-2.5 text-sm hover:bg-gold-500/5"
              >
                <span className="text-ink-900">{formatDateTime(g.playedAt)}</span>
                <Badge tone={g.status === "confirmed" ? "green" : g.status === "void" ? "neutral" : "gold"}>
                  {g.status === "confirmed" ? "確定済み" : g.status === "void" ? "無効" : "下書き"}
                </Badge>
              </Link>
            ))}
          </Card>
        </div>
      )}

      {isOrganizer && (
        <div className="space-y-2 border-t border-ink-400/10 pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
            募集者向け操作
          </p>
          <CopyRecruitmentButton event={event} />
          <Link href={`/g/${groupId}/events/${event.id}/edit`} className="block">
            <Button variant="secondary" className="w-full">
              募集内容を編集する
            </Button>
          </Link>
          {(formation.isOverCapacity || deadlinePassed || event.status !== "open") &&
            requiresAdjustment && (
            <Link href={`/g/${groupId}/events/${event.id}/adjust`} className="block">
              <Button variant="secondary" className="w-full">
                参加者を調整する
              </Button>
            </Link>
          )}
          <DeleteEventButton groupId={groupId} eventId={event.id} />
        </div>
      )}
    </div>
  );
}
