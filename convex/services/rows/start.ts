import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { NotFoundError, ValidationFailedError } from "../../lib/errors";
import { throwDomain } from "../../lib/ownerFunctions";
import { requireOwnedRow } from "./requireOwnedRow";
import { rowDayLiveness } from "./rowDayLiveness";
import { stopRunningTimer } from "./stopRunningTimer";

export async function start(
  ctx: MutationCtx,
  ownerId: string,
  args: { rowId: Id<"rows"> },
): Promise<null> {
  const row = await requireOwnedRow(ctx, ownerId, args.rowId);
  if ((await rowDayLiveness(ctx, ownerId, row)) !== "live") {
    throwDomain(new NotFoundError({ message: "日が見つかりません", resource: "日" }));
  }
  if (row.status !== "未着手") {
    throwDomain(new ValidationFailedError({ message: "未着手の記録だけ進行中にできます" }));
  }
  //? 同時に計測するのは1件だけ。走っていた計測は同一トランザクションで畳む(study-timer.md §4.4)。
  await stopRunningTimer(ctx, ownerId, args.rowId);
  //? 着手はそのまま計測開始(T1)。目安分数は実績ではないので accumulated は 0 から。
  await ctx.db.patch("rows", args.rowId, {
    status: "進行中",
    timerAccumulatedMs: 0,
    timerAutoStoppedAt: undefined,
    timerStartedAt: Date.now(),
  });
  return null;
}
