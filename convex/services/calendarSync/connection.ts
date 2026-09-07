import type { Doc, Id } from "../../_generated/dataModel";
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
import { getConnection, getOutputSettings } from "./getConnection";
import { migrateConnections } from "./migrateConnections";

export async function upsertConnection(
  ctx: MutationCtx,
  args: UpsertConnectionArgs,
): Promise<Id<"calendarConnections">> {
  const [settings, existing, anyConnection] = await Promise.all([
    migrateConnections(ctx, args.ownerId),
    ctx.db
      .query("calendarConnections")
      .withIndex("by_owner_and_googleAccountId", (q) =>
        q.eq("ownerId", args.ownerId).eq("googleAccountId", args.googleAccountId),
      )
      .unique(),
    ctx.db
      .query("calendarConnections")
      .withIndex("by_owner_and_googleAccountId", (q) => q.eq("ownerId", args.ownerId))
      .first(),
  ]);
  if (existing?.disconnecting === true) {
    throwDomain(new ConflictError({ message: CALENDAR_SYNC_DISCONNECT_INCOMPLETE_MESSAGE }));
  }
  //? 外部予定を編集できるのは所有者が最初に接続した Google アカウント1つ（移行前の接続、
  //? 無ければ初回接続）。追加アカウントは閲覧専用（Q3）。同じアカウントの再接続は編集権を保つ
  let editableGoogleAccountId = settings?.editableGoogleAccountId;
  if (settings !== null && editableGoogleAccountId === undefined && anyConnection === null) {
    editableGoogleAccountId = args.googleAccountId;
    await ctx.db.patch("calendarOutputSettings", settings._id, { editableGoogleAccountId });
  }
  const known = new Set(args.calendars.map((calendar) => calendar.id));
  const visibleCalendarIds = (
    existing?.visibleCalendarIds ?? args.defaultVisibleCalendarIds
  ).filter((id) => known.has(id));
  const fields = {
    externalChangesVersion: existing === null ? 1 : existing.externalChangesVersion,
    externalReadOnly: args.googleAccountId !== editableGoogleAccountId,
    canWrite: args.canWrite ?? existing?.canWrite ?? true,
    calendars: args.calendars,
    googleAccountId: args.googleAccountId,
    googleEmail: args.googleEmail ?? undefined,
    lastError: undefined,
    primaryCalendarId:
      args.calendars.find((calendar) => calendar.primary)?.id ?? PRIMARY_CALENDAR_ID,
    status: "ok",
    visibleCalendarIds,
  } satisfies Omit<Doc<"calendarConnections">, "_id" | "_creationTime" | "ownerId">;
  if (existing === null)
    return ctx.db.insert("calendarConnections", { ...fields, ownerId: args.ownerId });
  await ctx.db.patch("calendarConnections", existing._id, fields);
  return existing._id;
}

export async function markStatus(
  ctx: MutationCtx,
  args: {
    connectionId?: Id<"calendarConnections">;
    lastError: string | null;
    ownerId: string;
    status: CalendarSyncStatus;
    syncedAt: number | null;
  },
): Promise<null> {
  const existing = await getConnection(ctx, args.ownerId, args.connectionId);
  if (existing === null || existing.disconnecting === true) return null;
  await ctx.db.patch("calendarConnections", existing._id, {
    lastError: args.lastError ?? undefined,
    lastSyncedAt: args.syncedAt ?? existing.lastSyncedAt,
    status: args.status,
  });
  return null;
}

export async function clearConnection(
  ctx: MutationCtx,
  ownerId: string,
  connectionId?: Id<"calendarConnections">,
): Promise<boolean> {
  const connection = await getConnection(ctx, ownerId, connectionId);
  if (connection === null) return true;
  if (connection.disconnecting !== true) {
    await ctx.db.patch("calendarConnections", connection._id, {
      disconnecting: true,
      lastError: CALENDAR_SYNC_DISCONNECT_INCOMPLETE_MESSAGE,
      status: "error",
    });
  }
  if (!(await clearSyncStateBatch(ctx, ownerId, connection._id))) return false;
  const settings = await getOutputSettings(ctx, ownerId);
  if (settings?.connectionId === connection._id) {
    await ctx.db.patch("calendarOutputSettings", settings._id, {
      connectionId: undefined,
      calendarId: undefined,
      changing: undefined,
      generation: settings.generation + 1,
    });
  }
  await ctx.db.delete("calendarConnections", connection._id);
  return true;
}

export async function setVisibleCalendars(
  ctx: MutationCtx,
  ownerId: string,
  calendarIds: readonly string[],
  connectionId?: Id<"calendarConnections">,
): Promise<boolean> {
  const connection = await getConnection(ctx, ownerId, connectionId);
  if (connection === null || connection.disconnecting === true) return false;
  const known = new Set(connection.calendars.map((calendar) => calendar.id));
  const next = [...new Set(calendarIds.filter((id) => known.has(id)))];
  const visible = new Set(connection.visibleCalendarIds);
  const added = next.filter((id) => !visible.has(id));
  await ctx.db.patch("calendarConnections", connection._id, { visibleCalendarIds: next });
  await Promise.all(
    added.map((calendarId) =>
      resetCalendarCursor(ctx, ownerId, calendarId, { dropExternals: false }, connection._id),
    ),
  );
  return true;
}

export async function resetCalendarCursor(
  ctx: MutationCtx,
  ownerId: string,
  calendarId: string,
  options: { dropExternals: boolean },
  connectionId?: Id<"calendarConnections">,
): Promise<null> {
  const connection = await getConnection(ctx, ownerId, connectionId);
  if (connection === null) return null;
  const legacy = await getConnection(ctx, ownerId);
  const scopes = connection._id === legacy?._id ? [connection._id, undefined] : [connection._id];
  for (const scope of scopes) {
    const cursor = await ctx.db
      .query("calendarSyncCursors")
      .withIndex("by_owner_and_connectionId_and_calendarId", (q) =>
        q.eq("ownerId", ownerId).eq("connectionId", scope).eq("calendarId", calendarId),
      )
      .unique();
    if (cursor !== null) await ctx.db.delete("calendarSyncCursors", cursor._id);
    if (options.dropExternals) {
      for await (const event of ctx.db
        .query("externalCalendarEvents")
        .withIndex("by_owner_and_connectionId_and_calendarId_and_googleEventId", (q) =>
          q.eq("ownerId", ownerId).eq("connectionId", scope).eq("calendarId", calendarId),
        ))
        await ctx.db.delete("externalCalendarEvents", event._id);
    }
  }
  return null;
}
