import type { MutationCtx } from "../../_generated/server";
import type { CalendarSyncStatus } from "../../lib/calendarSync";
import { PRIMARY_CALENDAR_ID } from "../../lib/calendarSync";
import type { GoogleCalendarSummary } from "../../lib/validators";
import { getConnection } from "./getConnection";

export type UpsertConnectionArgs = {
  calendars: GoogleCalendarSummary[];
  defaultVisibleCalendarIds: string[];
  googleAccountId: string;
  googleEmail: string | null;
  ownerId: string;
};

//? 対応表・外部予定の写し・差分トークンをすべて消す（接続の行は残す）
export async function clearSyncState(ctx: MutationCtx, ownerId: string): Promise<void> {
  const [links, externals, cursors] = await Promise.all([
    ctx.db
      .query("calendarSyncLinks")
      .withIndex("by_owner_and_calendar_and_event", (q) => q.eq("ownerId", ownerId))
      .collect(),
    ctx.db
      .query("externalCalendarEvents")
      .withIndex("by_owner_and_startAt", (q) => q.eq("ownerId", ownerId))
      .collect(),
    ctx.db
      .query("calendarSyncCursors")
      .withIndex("by_owner_and_calendar", (q) => q.eq("ownerId", ownerId))
      .collect(),
  ]);
  await Promise.all([
    ...links.map((link) => ctx.db.delete("calendarSyncLinks", link._id)),
    ...externals.map((external) => ctx.db.delete("externalCalendarEvents", external._id)),
    ...cursors.map((cursor) => ctx.db.delete("calendarSyncCursors", cursor._id)),
  ]);
}

//? 接続（再接続）。表示カレンダーの選択は既存があれば引き継ぎ、今の一覧に無いものは落とす。
//? 別の Google アカウントに替えたら、前のアカウントの対応表・写し・差分トークンは意味を失うので消す
export async function upsertConnection(
  ctx: MutationCtx,
  args: UpsertConnectionArgs,
): Promise<null> {
  const existing = await getConnection(ctx, args.ownerId);
  if (existing !== null && existing.googleAccountId !== args.googleAccountId) {
    await clearSyncState(ctx, args.ownerId);
  }
  const known = new Set(args.calendars.map((calendar) => calendar.id));
  const visibleCalendarIds = (
    existing === null ? args.defaultVisibleCalendarIds : existing.visibleCalendarIds
  ).filter((id) => known.has(id));
  const fields = {
    calendars: args.calendars,
    googleAccountId: args.googleAccountId,
    googleEmail: args.googleEmail ?? undefined,
    lastError: undefined,
    primaryCalendarId:
      args.calendars.find((calendar) => calendar.primary)?.id ?? PRIMARY_CALENDAR_ID,
    status: "ok" as const,
    visibleCalendarIds,
  };
  if (existing === null) {
    await ctx.db.insert("calendarConnections", { ...fields, ownerId: args.ownerId });
    return null;
  }
  await ctx.db.patch("calendarConnections", existing._id, fields);
  return null;
}

export async function markStatus(
  ctx: MutationCtx,
  args: {
    lastError: string | null;
    ownerId: string;
    status: CalendarSyncStatus;
    syncedAt: number | null;
  },
): Promise<null> {
  const existing = await getConnection(ctx, args.ownerId);
  if (existing === null) {
    return null;
  }
  await ctx.db.patch("calendarConnections", existing._id, {
    lastError: args.lastError ?? undefined,
    lastSyncedAt: args.syncedAt ?? existing.lastSyncedAt,
    status: args.status,
  });
  return null;
}

//? 解除の後始末: 接続・対応表・外部予定の写し・差分トークンをすべて消す（Q19）
export async function clearConnection(ctx: MutationCtx, ownerId: string): Promise<null> {
  const connection = await getConnection(ctx, ownerId);
  await clearSyncState(ctx, ownerId);
  if (connection !== null) {
    await ctx.db.delete("calendarConnections", connection._id);
  }
  return null;
}

//? 表示カレンダーの変更。外したカレンダーの写しと差分トークンは捨てる
export async function setVisibleCalendars(
  ctx: MutationCtx,
  ownerId: string,
  calendarIds: readonly string[],
): Promise<{ removedCalendarIds: string[] } | null> {
  const connection = await getConnection(ctx, ownerId);
  if (connection === null) {
    return null;
  }
  const known = new Set(connection.calendars.map((calendar) => calendar.id));
  const next = [...new Set(calendarIds.filter((id) => known.has(id)))];
  const nextSet = new Set(next);
  const removedCalendarIds = connection.visibleCalendarIds.filter((id) => !nextSet.has(id));
  await ctx.db.patch("calendarConnections", connection._id, { visibleCalendarIds: next });
  await Promise.all(
    removedCalendarIds.map((calendarId) =>
      resetCalendarCursor(ctx, ownerId, calendarId, { dropExternals: true }),
    ),
  );
  return { removedCalendarIds };
}

//? 1カレンダーの差分トークンを捨てる（次の同期で期間の全件を取り直す）。写しも消すかは呼び手が決める
export async function resetCalendarCursor(
  ctx: MutationCtx,
  ownerId: string,
  calendarId: string,
  options: { dropExternals: boolean },
): Promise<null> {
  const cursor = await ctx.db
    .query("calendarSyncCursors")
    .withIndex("by_owner_and_calendar", (q) =>
      q.eq("ownerId", ownerId).eq("calendarId", calendarId),
    )
    .unique();
  if (cursor !== null) {
    await ctx.db.delete("calendarSyncCursors", cursor._id);
  }
  if (!options.dropExternals) {
    return null;
  }
  const externals = await ctx.db
    .query("externalCalendarEvents")
    .withIndex("by_owner_and_calendar_and_event", (q) =>
      q.eq("ownerId", ownerId).eq("calendarId", calendarId),
    )
    .collect();
  await Promise.all(
    externals.map((external) => ctx.db.delete("externalCalendarEvents", external._id)),
  );
  return null;
}
