import type { MutationCtx } from "../../_generated/server";
import { type CalendarSyncStatus, PRIMARY_CALENDAR_ID } from "../../lib/calendarSync";
import type { UpsertConnectionArgs } from "../../lib/validators";
import { getConnection } from "./getConnection";

export async function clearSyncState(ctx: MutationCtx, ownerId: string): Promise<void> {
  const [links, externals, cursors, changes] = await Promise.all([
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
    ctx.db
      .query("calendarExternalChanges")
      .withIndex("by_owner_and_calendar_and_event", (q) => q.eq("ownerId", ownerId))
      .collect(),
  ]);
  await Promise.all([
    ...changes.map((change) => ctx.db.delete("calendarExternalChanges", change._id)),
    ...links.map((link) => ctx.db.delete("calendarSyncLinks", link._id)),
    ...externals.map((external) => ctx.db.delete("externalCalendarEvents", external._id)),
    ...cursors.map((cursor) => ctx.db.delete("calendarSyncCursors", cursor._id)),
  ]);
}

export async function upsertConnection(
  ctx: MutationCtx,
  args: UpsertConnectionArgs,
): Promise<null> {
  const existing = await getConnection(ctx, args.ownerId);
  const sameAccount = existing !== null && existing.googleAccountId === args.googleAccountId;
  if (existing !== null && !sameAccount) {
    await clearSyncState(ctx, args.ownerId);
  }
  const known = new Set(args.calendars.map((calendar) => calendar.id));
  const visibleCalendarIds = (
    sameAccount ? existing.visibleCalendarIds : args.defaultVisibleCalendarIds
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
  if (existing === null || existing.disconnecting === true) {
    return null;
  }
  await ctx.db.patch("calendarConnections", existing._id, {
    lastError: args.lastError ?? undefined,
    lastSyncedAt: args.syncedAt ?? existing.lastSyncedAt,
    status: args.status,
  });
  return null;
}

export async function clearConnection(ctx: MutationCtx, ownerId: string): Promise<null> {
  const connection = await getConnection(ctx, ownerId);
  await clearSyncState(ctx, ownerId);
  if (connection !== null) {
    await ctx.db.delete("calendarConnections", connection._id);
  }
  return null;
}

export async function setVisibleCalendars(
  ctx: MutationCtx,
  ownerId: string,
  calendarIds: readonly string[],
): Promise<boolean> {
  const connection = await getConnection(ctx, ownerId);
  if (connection === null) {
    return false;
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
  return true;
}

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
