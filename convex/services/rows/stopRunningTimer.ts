import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { segmentElapsedMs } from "../../lib/rowTimer";
import { findRunningTimerRow } from "./findRunningTimerRow";

//* 同時計測は1件だけ(study-timer.md §4.4)。別の記録の計測を始めるとき、走っていた計測を畳む(T5)。
//? エラーにしない。開始はカンバンのドラッグから起きるので、失敗させると「進行中に移ったのに計測は
//? 始まっていない」半端な状態を見せてしまう。同一トランザクション内で退避するので二重計上の隙間は
//? できない(CVX-15)。
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
