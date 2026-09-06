import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { getConnection } from "./getConnection";

const BATCH_SIZE = 100;

export async function clearSyncStateBatch(
  ctx: MutationCtx,
  ownerId: string,
  connectionId: Id<"calendarConnections">,
): Promise<boolean> {
  const legacy = await getConnection(ctx, ownerId);
  const scopes = legacy?._id === connectionId ? [connectionId, undefined] : [connectionId];
  const batches = await Promise.all(
    scopes.map(async (scope) => {
      const [links, externals, cursors, changes] = await Promise.all([
        ctx.db
          .query("calendarSyncLinks")
          .withIndex("by_owner_and_connectionId_and_calendarId_and_googleEventId", (q) =>
            q.eq("ownerId", ownerId).eq("connectionId", scope),
          )
          .take(BATCH_SIZE),
        ctx.db
          .query("externalCalendarEvents")
          .withIndex("by_owner_and_connectionId_and_calendarId_and_googleEventId", (q) =>
            q.eq("ownerId", ownerId).eq("connectionId", scope),
          )
          .take(BATCH_SIZE),
        ctx.db
          .query("calendarSyncCursors")
          .withIndex("by_owner_and_connectionId_and_calendarId", (q) =>
            q.eq("ownerId", ownerId).eq("connectionId", scope),
          )
          .take(BATCH_SIZE),
        ctx.db
          .query("calendarExternalChanges")
          .withIndex("by_owner_and_connectionId_and_calendarId_and_googleEventId", (q) =>
            q.eq("ownerId", ownerId).eq("connectionId", scope),
          )
          .take(BATCH_SIZE),
      ]);
      await Promise.all([
        ...links.map((link) => ctx.db.delete("calendarSyncLinks", link._id)),
        ...externals.map((event) => ctx.db.delete("externalCalendarEvents", event._id)),
        ...cursors.map((cursor) => ctx.db.delete("calendarSyncCursors", cursor._id)),
        ...changes.map((change) => ctx.db.delete("calendarExternalChanges", change._id)),
      ]);
      return [links, externals, cursors, changes].every((batch) => batch.length < BATCH_SIZE);
    }),
  );
  return batches.every(Boolean);
}
