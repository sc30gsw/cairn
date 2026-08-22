import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { NotFoundError, ValidationFailedError } from "../../lib/errors";
import { throwDomain } from "../../lib/ownerFunctions";
import { requireOwnedRow } from "./requireOwnedRow";
import { rowDayLiveness } from "./rowDayLiveness";

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
  await ctx.db.patch("rows", args.rowId, { status: "進行中" });
  return null;
}
