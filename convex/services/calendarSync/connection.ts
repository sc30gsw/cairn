import type { Doc } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import {
  CALENDAR_SYNC_DISCONNECT_INCOMPLETE_MESSAGE,
  type CalendarSyncStatus,
  PRIMARY_CALENDAR_ID,
} from "../../lib/calendarSync";
import { ConflictError } from "../../lib/errors";
import { throwDomain } from "../../lib/ownerFunctions";
import type { UpsertConnectionArgs } from "../../lib/validators";
import { clearSyncStateBatch } from "./clearSyncStateBatch";
import { getConnection } from "./getConnection";

export async function upsertConnection(
  ctx: MutationCtx,
  args: UpsertConnectionArgs,
): Promise<null> {
  const existing = await getConnection(ctx, args.ownerId);
  const sameAccount = existing !== null && existing.googleAccountId === args.googleAccountId;
  if (existing !== null && (!sameAccount || existing.disconnecting === true)) {
    throwDomain(new ConflictError({ message: CALENDAR_SYNC_DISCONNECT_INCOMPLETE_MESSAGE }));
  }
  const known = new Set(args.calendars.map((calendar) => calendar.id));
  const visibleCalendarIds = (
    sameAccount ? existing.visibleCalendarIds : args.defaultVisibleCalendarIds
  ).filter((id) => known.has(id));
  const fields = {
    externalChangesVersion: sameAccount ? existing.externalChangesVersion : 1,
    calendars: args.calendars,
    googleAccountId: args.googleAccountId,
    googleEmail: args.googleEmail ?? undefined,
    lastError: undefined,
    primaryCalendarId:
      args.calendars.find((calendar) => calendar.primary)?.id ?? PRIMARY_CALENDAR_ID,
    status: "ok",
    visibleCalendarIds,
  } satisfies Omit<Doc<"calendarConnections">, "_id" | "_creationTime" | "ownerId">;
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

export async function clearConnection(ctx: MutationCtx, ownerId: string): Promise<boolean> {
  const connection = await getConnection(ctx, ownerId);
  if (connection !== null && connection.disconnecting !== true) {
    await ctx.db.patch("calendarConnections", connection._id, {
      disconnecting: true,
      lastError: CALENDAR_SYNC_DISCONNECT_INCOMPLETE_MESSAGE,
      status: "error",
    });
  }
  if (!(await clearSyncStateBatch(ctx, ownerId))) return false;
  if (connection !== null) {
    await ctx.db.delete("calendarConnections", connection._id);
  }
  return true;
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
