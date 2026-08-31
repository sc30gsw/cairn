import type { MutationCtx } from "../../_generated/server";
import { isSegmentExpired, TIMER_MAX_SEGMENT_MS } from "../../lib/rowTimer";

export async function autoStopTimers(ctx: MutationCtx, args: { now?: number } = {}): Promise<null> {
  const now = args.now ?? Date.now();
  const cutoff = now - TIMER_MAX_SEGMENT_MS;
  const stale = await ctx.db
    .query("rows")
    .withIndex("by_timerStartedAt", (q) => q.gte("timerStartedAt", 0).lte("timerStartedAt", cutoff))
    .collect();
  const due = stale.filter(
    (row) =>
      row.deletedAt === undefined &&
      row.status === "進行中" &&
      row.timerStartedAt !== undefined &&
      isSegmentExpired(row.timerStartedAt, now),
  );
  await Promise.all(
    due.map(async (row) =>
      ctx.db.patch("rows", row._id, {
        timerAccumulatedMs: (row.timerAccumulatedMs ?? 0) + TIMER_MAX_SEGMENT_MS,
        timerAutoStoppedAt: now,
        timerStartedAt: undefined,
      }),
    ),
  );
  return null;
}
