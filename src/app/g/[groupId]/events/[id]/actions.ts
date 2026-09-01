"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireMembership } from "@/lib/auth";

/** 募集者本人か、Groupのオーナーであることを要求する(編集・削除用) */
async function requireEventManager(groupId: string, eventId: string) {
  const { user, membership } = await requireMembership(groupId);
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event || event.groupId !== groupId) throw new Error("募集が見つかりません");
  if (event.organizerUserId !== user.id && membership.role !== "owner") {
    throw new Error("この募集を編集できるのは募集者か管理者のみです");
  }
  return { event };
}

export async function enterEvent(groupId: string, eventId: string) {
  const { user } = await requireMembership(groupId);

  await prisma.entry.upsert({
    where: { eventId_userId: { eventId, userId: user.id } },
    create: { eventId, userId: user.id, status: "entered" },
    update: { status: "entered", enteredAt: new Date(), cancelledAt: null },
  });

  revalidatePath(`/g/${groupId}/events/${eventId}`);
  revalidatePath(`/g/${groupId}`);
}

export async function cancelEntry(groupId: string, eventId: string) {
  const { user } = await requireMembership(groupId);

  await prisma.entry.update({
    where: { eventId_userId: { eventId, userId: user.id } },
    data: { status: "cancelled", cancelledAt: new Date() },
  });

  revalidatePath(`/g/${groupId}/events/${eventId}`);
  revalidatePath(`/g/${groupId}`);
}

/** 端数のまま締切を延長する(仕様11章: 募集を延長する) */
export async function extendDeadline(groupId: string, eventId: string, newDeadline: string) {
  await requireMembership(groupId);
  await prisma.event.update({
    where: { id: eventId },
    data: { entryDeadline: new Date(newDeadline) },
  });
  revalidatePath(`/g/${groupId}/events/${eventId}`);
  revalidatePath(`/g/${groupId}`);
}

/**
 * 参加者を確定する(仕様13章)。
 * 最終判断は募集者が行うため、selectedUserIdsは募集者がフォームで
 * 自由に変更した結果をそのまま受け取る。
 */
export async function finalizeParticipants(
  groupId: string,
  eventId: string,
  selectedUserIds: string[]
) {
  await requireMembership(groupId);

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { entries: true },
  });
  if (!event || event.groupId !== groupId) return;

  const validEntries = event.entries.filter((e) =>
    ["entered", "selected", "played"].includes(e.status)
  );

  await Promise.all(
    validEntries.map((entry) => {
      const selected = selectedUserIds.includes(entry.userId);
      return prisma.entry.update({
        where: { id: entry.id },
        data: selected
          ? { status: "selected", selectedAt: new Date() }
          : { status: "not_selected" },
      });
    })
  );

  await prisma.event.update({ where: { id: eventId }, data: { status: "finalized" } });

  revalidatePath(`/g/${groupId}/events/${eventId}`);
  revalidatePath(`/g/${groupId}`);
}

/** 募集内容を編集する(募集者本人か管理者のみ) */
export async function updateEvent(groupId: string, eventId: string, formData: FormData) {
  await requireEventManager(groupId, eventId);

  const title = String(formData.get("title") ?? "").trim();
  const eventDatetime = String(formData.get("eventDatetime") ?? "");
  const entryDeadline = String(formData.get("entryDeadline") ?? "");
  const maxTables = Number(formData.get("maxTables") ?? 1);
  const beginnerFriendly = formData.get("beginnerFriendly") === "on";
  const note = String(formData.get("note") ?? "").trim();

  if (!title || !eventDatetime || !entryDeadline || !maxTables || maxTables < 1) {
    throw new Error("入力内容を確認してください");
  }

  await prisma.event.update({
    where: { id: eventId },
    data: {
      title,
      eventDatetime: new Date(eventDatetime),
      entryDeadline: new Date(entryDeadline),
      maxTables,
      beginnerFriendly,
      note: note || null,
    },
  });

  revalidatePath(`/g/${groupId}/events/${eventId}`);
  revalidatePath(`/g/${groupId}`);
  redirect(`/g/${groupId}/events/${eventId}`);
}

/**
 * 募集を削除する(募集者本人か管理者のみ)。
 * 対局記録が既に紐づいている場合は履歴保護のため削除できない。
 */
export async function deleteEvent(groupId: string, eventId: string) {
  const { event } = await requireEventManager(groupId, eventId);

  const gameCount = await prisma.game.count({ where: { eventId } });
  if (gameCount > 0) {
    throw new Error("この募集には対局記録が紐づいているため削除できません");
  }

  await prisma.entry.deleteMany({ where: { eventId } });
  await prisma.event.delete({ where: { id: event.id } });

  revalidatePath(`/g/${groupId}`);
}
