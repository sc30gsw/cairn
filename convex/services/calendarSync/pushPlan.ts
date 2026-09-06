import type { QueryCtx } from "../../_generated/server";
import type { CalendarSyncSourceKind } from "../../lib/calendarSync";
import type { PushPlan } from "../../lib/validators";
import { getOutput } from "./getConnection";
import { findLink, syncSource } from "./syncSource";

export async function pushPlan(
  ctx: QueryCtx,
  args: { ownerId: string; sourceId: string; sourceKind: CalendarSyncSourceKind },
): Promise<PushPlan> {
  const output = await getOutput(ctx, args.ownerId);
  if (output === null || output.changing || output.connection.disconnecting === true) {
    return null;
  }
  const connection = output.connection;
  const link = await findLink(ctx, args.ownerId, args.sourceKind, args.sourceId);
  return {
    connectionId: connection._id,
    generation: output.generation,
    googleAccountId: connection.googleAccountId,
    calendarId: output.calendarId,
    source: await syncSource(ctx, args.ownerId, args.sourceKind, args.sourceId, link),
  };
}
