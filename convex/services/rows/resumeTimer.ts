import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { NotFoundError, ValidationFailedError } from "../../lib/errors";
import { throwDomain } from "../../lib/ownerFunctions";
import { requireOwnedRow } from "./requireOwnedRow";
import { rowDayLiveness } from "./rowDayLiveness";
import { stopRunningTimer } from "./stopRunningTimer";

//* 計測を(再)開始する(T3)。累積は残したまま新しい区間を開く。自動停止の目印は消す。
export async function resumeTimer(
  ctx: MutationCtx,
  ownerId: string,
  args: { rowId: Id<"rows"> },
): Promise<null> {
  const row = await requireOwnedRow(ctx, ownerId, args.rowId);
  if ((await rowDayLiveness(ctx, ownerId, row)) !== "live") {
    throwDomain(new NotFoundError({ message: "日が見つかりません", resource: "日" }));
  }
  if (row.status !== "進行中") {
    throwDomain(new ValidationFailedError({ message: "進行中の記録だけ計測を再開できます" }));
  }
  if (row.timerStartedAt !== undefined) {
    return null;
  }
  //? 同時計測は1件だけ。走っている別の行を同一トランザクションで畳む(§4.4)。
  await stopRunningTimer(ctx, ownerId, args.rowId);
  await ctx.db.patch("rows", args.rowId, {
    timerAccumulatedMs: row.timerAccumulatedMs ?? 0,
    timerAutoStoppedAt: undefined,
    timerStartedAt: Date.now(),
  });
  return null;
}
