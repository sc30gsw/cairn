import type { QueryCtx } from "../../_generated/server";
import type { CalendarSyncSourceKind } from "../../lib/calendarSync";
import type { PushPlan } from "../../lib/validators";
import { getConnection } from "./getConnection";
import { findLink, syncSource } from "./syncSource";

export async function pushPlan(
  ctx: QueryCtx,
  args: { ownerId: string; sourceId: string; sourceKind: CalendarSyncSourceKind },
): Promise<PushPlan> {
  const connection = await getConnection(ctx, args.ownerId);
  if (connection === null || connection.disconnecting === true) {
    return null;
  }
  const link = await findLink(ctx, args.ownerId, args.sourceKind, args.sourceId);
  return {
    googleAccountId: connection.googleAccountId,
    calendarId: connection.primaryCalendarId,
    source: await syncSource(ctx, args.ownerId, args.sourceKind, args.sourceId, link),
  };
}
