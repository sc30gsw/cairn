import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { NotFoundError } from "../../lib/errors";
import type { OwnerId } from "../../lib/owner";
import { throwDomain } from "../../lib/ownerFunctions";
import { deleteRowsByIds } from "../../lib/trash";

export async function purgeRow(
  ctx: MutationCtx,
  ownerId: OwnerId,
  args: { rowId: Id<"rows"> },
): Promise<null> {
  const row = await ctx.db.get("rows", args.rowId);
  if (row === null || row.ownerId !== ownerId || row.deletedAt === undefined) {
    throwDomain(new NotFoundError({ message: "ゴミ箱にその記録はありません", resource: "記録" }));
  }
  await deleteRowsByIds(ctx, [args.rowId]);
  return null;
}
