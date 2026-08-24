import type { Doc } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";

//* 所有者の「いま計測中の1件」。同時計測は最大1件という不変条件の読み取り口(study-timer.md §4.4)。
//? .filter() を使わず by_owner_and_timerStartedAt の範囲条件で引き、.take で切る(CVX-10/11)。
//? deletedAt の除外は取得後の TypeScript 側。不変条件(T12 が消す)により本来0件だが、万一残った
//? ゴミ箱の行が先頭に来ても走っている行を隠さないよう、数件だけ取って最初の生存行を返す。
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
