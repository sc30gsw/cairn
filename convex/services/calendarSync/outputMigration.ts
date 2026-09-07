import type { Doc, Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { canWriteCalendar } from "../../lib/calendarSync";
import { ConflictError, ForbiddenError, NotFoundError } from "../../lib/errors";
import { throwDomain } from "../../lib/ownerFunctions";
import { getConnection, getOutputSettings } from "./getConnection";
import { migrateConnections } from "./migrateConnections";

export async function beginOutputChange(
  ctx: MutationCtx,
  args: { ownerId: string; connectionId: Id<"calendarConnections">; calendarId: string },
): Promise<number> {
  const connection = await getConnection(ctx, args.ownerId, args.connectionId);
  if (connection === null)
    throwDomain(new NotFoundError({ resource: "接続", message: "接続が見つかりません" }));
  if (
    connection.disconnecting ||
    connection.canWrite === false ||
    !canWriteCalendar(
      connection.calendars.find((calendar) => calendar.id === args.calendarId)?.accessRole,
    )
  )
    throwDomain(new ForbiddenError({ message: "書き込み権限を許可してから選択してください" }));
  const settings = await migrateConnections(ctx, args.ownerId);
  if (settings === null)
    throwDomain(new ConflictError({ message: "出力先の設定を保存できません" }));
  if (
    settings.changing &&
    (settings.nextConnectionId !== args.connectionId || settings.nextCalendarId !== args.calendarId)
  )
    throwDomain(
      new ConflictError({ message: "前の書き込み先変更を完了してから再試行してください" }),
    );
  if (
    settings.changing ||
    (settings.connectionId === args.connectionId && settings.calendarId === args.calendarId)
  )
    return settings.generation;
  await ctx.db.patch("calendarOutputSettings", settings._id, {
    changing: true,
    nextConnectionId: args.connectionId,
    nextCalendarId: args.calendarId,
    generation: settings.generation + 1,
  });
  return settings.generation + 1;
}

export async function recordOutputMove(
  ctx: MutationCtx,
  args: {
    ownerId: string;
    generation: number;
    linkId: Id<"calendarSyncLinks">;
    pendingMove?: Doc<"calendarSyncLinks">["pendingMove"];
  },
): Promise<boolean> {
  const [settings, link] = await Promise.all([
    getOutputSettings(ctx, args.ownerId),
    ctx.db.get("calendarSyncLinks", args.linkId),
  ]);
  if (
    !settings?.changing ||
    settings.generation !== args.generation ||
    link?.ownerId !== args.ownerId
  )
    return false;
  await ctx.db.patch("calendarSyncLinks", link._id, { pendingMove: args.pendingMove });
  return true;
}

export async function finishOutputMove(
  ctx: MutationCtx,
  args: { ownerId: string; generation: number; linkId: Id<"calendarSyncLinks"> },
): Promise<boolean> {
  const [settings, link] = await Promise.all([
    getOutputSettings(ctx, args.ownerId),
    ctx.db.get("calendarSyncLinks", args.linkId),
  ]);
  if (
    !settings?.changing ||
    settings.generation !== args.generation ||
    link?.ownerId !== args.ownerId
  )
    return false;
  if (link.pendingMove === undefined) await ctx.db.delete("calendarSyncLinks", link._id);
  else
    await ctx.db.patch("calendarSyncLinks", link._id, {
      ...link.pendingMove,
      pendingMove: undefined,
      appChangedAt: Date.now(),
    });
  return true;
}

export async function finishOutputChange(
  ctx: MutationCtx,
  args: { ownerId: string; generation: number },
): Promise<boolean> {
  const settings = await getOutputSettings(ctx, args.ownerId);
  if (!settings?.changing || settings.generation !== args.generation) return false;
  const remaining = await ctx.db
    .query("calendarSyncLinks")
    .withIndex("by_owner_and_calendar_and_event", (q) => q.eq("ownerId", args.ownerId))
    .filter((q) =>
      q.or(
        q.neq(q.field("connectionId"), settings.nextConnectionId),
        q.neq(q.field("calendarId"), settings.nextCalendarId),
      ),
    )
    .first();
  if (remaining !== null) return false;
  await ctx.db.patch("calendarOutputSettings", settings._id, {
    connectionId: settings.nextConnectionId,
    calendarId: settings.nextCalendarId,
    changing: undefined,
    nextConnectionId: undefined,
    nextCalendarId: undefined,
  });
  return true;
}
