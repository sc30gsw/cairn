import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import type { ActionCtx } from "../../_generated/server";

export async function clearConnectionState(
  ctx: ActionCtx,
  ownerId: string,
  connectionId?: Id<"calendarConnections">,
): Promise<void> {
  let complete = false;
  while (!complete) {
    complete = await ctx.runMutation(
      internal.mutations.calendarSync.clearConnection.clearConnection,
      { ownerId, connectionId },
    );
  }
}
