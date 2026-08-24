import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { NotFoundError, ValidationFailedError } from "../../lib/errors";
import { throwDomain } from "../../lib/ownerFunctions";
import { clearTimerFields } from "./clearTimerFields";
import { requireOwnedRow } from "./requireOwnedRow";
import { rowDayLiveness } from "./rowDayLiveness";

//? 一時停止ではない。進行中の取り消し(未着手へ戻す)。計測の一時停止は stopTimer。
export async function pause(
  ctx: MutationCtx,
  ownerId: string,
  args: { rowId: Id<"rows"> },
): Promise<null> {
  const row = await requireOwnedRow(ctx, ownerId, args.rowId);
  if ((await rowDayLiveness(ctx, ownerId, row)) !== "live") {
    throwDomain(new NotFoundError({ message: "日が見つかりません", resource: "日" }));
  }
  if (row.status !== "進行中") {
    throwDomain(new ValidationFailedError({ message: "進行中の記録だけ未着手に戻せます" }));
  }
  //? 未着手へ戻すと計測は捨てる(T7)。UI 側で必ず Confirm を出す(study-timer.md §13.4)。
  await ctx.db.patch("rows", args.rowId, { ...clearTimerFields(), status: "未着手" });
  return null;
}
