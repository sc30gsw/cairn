import type { Doc, Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { getConnection } from "./getConnection";
import { overlapsWindow, syncWindow } from "./window";

export async function finishCalendarPull(
  ctx: MutationCtx,
  args: {
    connectionId?: Id<"calendarConnections">;
    calendarId: string;
    keepEventIds: readonly string[] | null;
    ownerId: string;
    syncToken: string | null;
    todayJst: string;
  },
): Promise<null> {
  const connection = await getConnection(ctx, args.ownerId, args.connectionId);
  if (connection === null) return null;
  const legacy = await getConnection(ctx, args.ownerId);
  const window = syncWindow(args.todayJst);
  const keep = args.keepEventIds === null ? null : new Set(args.keepEventIds);
  const externals = await ctx.db
    .query("externalCalendarEvents")
    .withIndex("by_owner_and_calendar_and_event", (q) =>
      q.eq("ownerId", args.ownerId).eq("calendarId", args.calendarId),
    )
    .collect();
  await Promise.all(
    externals.map(async (external) => {
      if ((external.connectionId ?? legacy?._id) !== connection._id) return;
      if (overlapsWindow(external, window) && (keep === null || keep.has(external.googleEventId))) {
        return;
      }
      const pending = await ctx.db
        .query("calendarExternalChanges")
        .withIndex("by_owner_and_calendar_and_event", (q) =>
          q
            .eq("ownerId", args.ownerId)
            .eq("calendarId", args.calendarId)
            .eq("googleEventId", external.googleEventId),
        )
        .unique();
      if (pending === null || pending.settledAt !== undefined) {
        await ctx.db.delete("externalCalendarEvents", external._id);
      }
    }),
  );
  const cursors = await ctx.db
    .query("calendarSyncCursors")
    .withIndex("by_owner_and_calendar", (q) =>
      q.eq("ownerId", args.ownerId).eq("calendarId", args.calendarId),
    )
    .take(1000);
  const cursor =
    cursors.find((entry) => (entry.connectionId ?? legacy?._id) === connection._id) ?? null;
  if (args.syncToken === null) {
    if (cursor !== null) {
      await ctx.db.delete("calendarSyncCursors", cursor._id);
    }
    return null;
  }
  const fullSyncedOnJst =
    args.keepEventIds !== null || cursor === null ? args.todayJst : cursor.fullSyncedOnJst;
  if (cursor === null) {
    await ctx.db.insert("calendarSyncCursors", {
      calendarId: args.calendarId,
      connectionId: connection._id,
      fullSyncedOnJst,
      ownerId: args.ownerId,
      syncToken: args.syncToken,
    });
    return null;
  }
  await ctx.db.patch("calendarSyncCursors", cursor._id, {
    fullSyncedOnJst,
    syncToken: args.syncToken,
  });
  return null;
}

export async function finishPullPage(
  ctx: MutationCtx,
  args: {
    ownerId: string;
    connectionId: Id<"calendarConnections">;
    calendarId: string;
    pullId: string;
    full: boolean;
    todayJst: string;
    syncToken: string | null;
    cursor: string | null;
  },
): Promise<string | null> {
  const connection = await getConnection(ctx, args.ownerId, args.connectionId);
  if (connection === null || connection.disconnecting) return null;
  const legacy = await getConnection(ctx, args.ownerId);
  const window = syncWindow(args.todayJst);
  const page = await ctx.db
    .query("externalCalendarEvents")
    .withIndex("by_owner_and_calendar_and_event", (q) =>
      q.eq("ownerId", args.ownerId).eq("calendarId", args.calendarId),
    )
    .paginate({ cursor: args.cursor, numItems: 100 });
  await Promise.all(
    page.page.map(async (external) => {
      if ((external.connectionId ?? legacy?._id) !== connection._id) return;
      if (overlapsWindow(external, window) && (!args.full || external.lastPullId === args.pullId))
        return;
      const pending = await ctx.db
        .query("calendarExternalChanges")
        .withIndex("by_owner_and_calendar_and_event", (q) =>
          q
            .eq("ownerId", args.ownerId)
            .eq("calendarId", args.calendarId)
            .eq("googleEventId", external.googleEventId),
        )
        .unique();
      if (pending === null || pending.settledAt !== undefined)
        await ctx.db.delete("externalCalendarEvents", external._id);
    }),
  );
  if (!page.isDone) return page.continueCursor;
  const existing: Doc<"calendarSyncCursors">[] = [];
  for await (const cursor of ctx.db
    .query("calendarSyncCursors")
    .withIndex("by_owner_and_calendar", (q) =>
      q.eq("ownerId", args.ownerId).eq("calendarId", args.calendarId),
    )) {
    if ((cursor.connectionId ?? legacy?._id) === connection._id) existing.push(cursor);
  }
  const stored = existing[0];
  if (args.syncToken === null) {
    await Promise.all(existing.map((cursor) => ctx.db.delete("calendarSyncCursors", cursor._id)));
  } else {
    const fields = {
      connectionId: connection._id,
      calendarId: args.calendarId,
      ownerId: args.ownerId,
      syncToken: args.syncToken,
      fullSyncedOnJst: args.full || stored === undefined ? args.todayJst : stored.fullSyncedOnJst,
    };
    if (stored === undefined) await ctx.db.insert("calendarSyncCursors", fields);
    else await ctx.db.patch("calendarSyncCursors", stored._id, fields);
  }
  return null;
}
