import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { NotFoundError, ValidationFailedError } from "../../lib/errors";
import { throwDomain } from "../../lib/ownerFunctions";
import { segmentElapsedMs } from "../../lib/rowTimer";
import { requireOwnedRow } from "./requireOwnedRow";
import { rowDayLiveness } from "./rowDayLiveness";

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
