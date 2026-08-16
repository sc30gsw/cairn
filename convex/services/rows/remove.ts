import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { requireOwnedRow } from "./requireOwnedRow";

export async function remove(
  ctx: MutationCtx,
  ownerId: string,
  args: { rowId: Id<"rows"> },
): Promise<null> {
  await requireOwnedRow(ctx, ownerId, args.rowId);
  await ctx.db.patch("rows", args.rowId, { deletedAt: Date.now() });
  return null;
}
