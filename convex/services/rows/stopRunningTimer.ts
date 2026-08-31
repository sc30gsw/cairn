import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { segmentElapsedMs } from "../../lib/rowTimer";
import { findRunningTimerRow } from "./findRunningTimerRow";

export async function stopRunningTimer(
  ctx: MutationCtx,
  ownerId: string,
  exceptRowId?: Id<"rows">,
): Promise<null> {
  const running = await findRunningTimerRow(ctx, ownerId);
  if (running === null || running._id === exceptRowId || running.timerStartedAt === undefined) {
    return null;
  }
  await ctx.db.patch("rows", running._id, {
    timerAccumulatedMs:
      (running.timerAccumulatedMs ?? 0) + segmentElapsedMs(running.timerStartedAt, Date.now()),
    timerStartedAt: undefined,
  });
  return null;
}
