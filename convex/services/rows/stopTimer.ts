import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { NotFoundError, ValidationFailedError } from "../../lib/errors";
import { throwDomain } from "../../lib/ownerFunctions";
import { segmentElapsedMs } from "../../lib/rowTimer";
import { requireOwnedRow } from "./requireOwnedRow";
import { rowDayLiveness } from "./rowDayLiveness";

//* 計測を止める(T2)。サーバの Date.now() で区間を畳むので、端末の時計ずれが記録値に入らない
//? (study-timer.md §8.3)。戻り値は加算後の accumulated — 確定モーダルのプレフィルに使う。
//? 計測していない進行中行への呼び出しは冪等(T2')。古いタブが押しても失敗させず現在値を返す。
export async function stopTimer(
  ctx: MutationCtx,
  ownerId: string,
  args: { rowId: Id<"rows"> },
): Promise<number> {
  const row = await requireOwnedRow(ctx, ownerId, args.rowId);
  if ((await rowDayLiveness(ctx, ownerId, row)) !== "live") {
    throwDomain(new NotFoundError({ message: "日が見つかりません", resource: "日" }));
  }
  if (row.status !== "進行中") {
    throwDomain(new ValidationFailedError({ message: "進行中の記録だけ計測を止められます" }));
  }
  const accumulatedMs = row.timerAccumulatedMs ?? 0;
  if (row.timerStartedAt === undefined) {
    return accumulatedMs;
  }
  const folded = accumulatedMs + segmentElapsedMs(row.timerStartedAt, Date.now());
  await ctx.db.patch("rows", args.rowId, {
    timerAccumulatedMs: folded,
    timerStartedAt: undefined,
  });
  return folded;
}
