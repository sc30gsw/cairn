import type { MutationCtx } from "../../_generated/server";
import { isSegmentExpired, TIMER_MAX_SEGMENT_MS } from "../../lib/rowTimer";

//* 放置の後始末(T4)。進行中のまま計測だけ止め、目印を立てる。自動確定はしない(study-timer.md §10)。
//? 加算値は TIMER_MAX_SEGMENT_MS 固定で now に依らないので、cron が遅れても記録される値は変わらない。
export async function autoStopTimers(ctx: MutationCtx, args: { now?: number } = {}): Promise<null> {
  const now = args.now ?? Date.now();
  const cutoff = now - TIMER_MAX_SEGMENT_MS;
  //? 期限切れだけに絞るので件数は数件。purgeExpired と同じ範囲クエリの形(CVX-11)。
  const stale = await ctx.db
    .query("rows")
    .withIndex("by_timerStartedAt", (q) => q.gte("timerStartedAt", 0).lte("timerStartedAt", cutoff))
    .collect();
  //? 不変条件により削除済み・進行中以外は来ないが、来たら黙って見送る。期限の境界は表示のクランプと
  //? 同じ純関数で判定する(範囲条件と二重だが、240分の定義を1箇所に保つ)。
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
