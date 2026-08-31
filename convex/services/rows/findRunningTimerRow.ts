import type { Doc } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";

const RUNNING_TIMER_SCAN_LIMIT = 8;

export async function findRunningTimerRow(
  ctx: MutationCtx | QueryCtx,
  ownerId: string,
): Promise<Doc<"rows"> | null> {
  const running = await ctx.db
    .query("rows")
    .withIndex("by_owner_and_timerStartedAt", (q) =>
      q.eq("ownerId", ownerId).gte("timerStartedAt", 0),
    )
    .take(RUNNING_TIMER_SCAN_LIMIT);
  return running.find((row) => row.deletedAt === undefined) ?? null;
}
