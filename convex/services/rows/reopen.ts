import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { NotFoundError, ValidationFailedError } from "../../lib/errors";
import { throwDomain } from "../../lib/ownerFunctions";
import { withMasteryProgressDelta } from "../goals/withMasteryProgressDelta";
import { requireOwnedRow } from "./requireOwnedRow";
import { rowDayLiveness } from "./rowDayLiveness";

export async function reopen(
  ctx: MutationCtx,
  ownerId: string,
  args: { rowId: Id<"rows"> },
): Promise<null> {
  const row = await requireOwnedRow(ctx, ownerId, args.rowId);
  if ((await rowDayLiveness(ctx, ownerId, row)) !== "live") {
    throwDomain(new NotFoundError({ message: "日が見つかりません", resource: "日" }));
  }
  if (row.status !== "確定") {
    throwDomain(new ValidationFailedError({ message: "確定した記録だけ進行中に戻せます" }));
  }
  await withMasteryProgressDelta(ctx, ownerId, row, async () => {
    await ctx.db.patch("rows", args.rowId, { status: "進行中" });
  });
  return null;
}
