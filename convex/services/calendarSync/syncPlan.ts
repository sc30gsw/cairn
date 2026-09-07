import type { Id } from "../../_generated/dataModel";
import type { QueryCtx } from "../../_generated/server";
import type { SyncPlan } from "../../lib/validators";
import { getConnection, getOutput } from "./getConnection";

export async function syncPlan(
  ctx: QueryCtx,
  args: {
    connectionId?: Id<"calendarConnections">;
    ownerId: string;
    todayJst: string;
  },
): Promise<SyncPlan> {
  const connection = await getConnection(ctx, args.ownerId, args.connectionId);
  if (connection === null) {
    return null;
  }
  const [output, legacy, cursors] = await Promise.all([
    getOutput(ctx, args.ownerId),
    getConnection(ctx, args.ownerId),
    ctx.db
      .query("calendarSyncCursors")
      .withIndex("by_owner_and_calendar", (q) => q.eq("ownerId", args.ownerId))
      .collect(),
  ]);
  const isOutput = output?.connection._id === connection._id && !output.changing;
  return {
    connectionId: connection._id,
    generation: output?.generation ?? 0,
    isOutput,
    googleAccountId: connection.googleAccountId,
    disconnecting: connection.disconnecting === true,
    calendarId: isOutput ? output.calendarId : connection.primaryCalendarId,
    cursors: cursors.flatMap((cursor) =>
      (cursor.connectionId ?? legacy?._id) === connection._id
        ? [
            {
              calendarId: cursor.calendarId,
              fullSyncedOnJst: cursor.fullSyncedOnJst,
              syncToken: cursor.syncToken,
            },
          ]
        : [],
    ),
    visibleCalendarIds: connection.visibleCalendarIds,
  };
}
