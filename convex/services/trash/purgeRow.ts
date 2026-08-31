import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { NotFoundError } from "../../lib/errors";
import { throwDomain } from "../../lib/ownerFunctions";

export async function purgeRow(
  ctx: MutationCtx,
  ownerId: string,
  args: { rowId: Id<"rows"> },
): Promise<null> {
  const row = await ctx.db.get("rows", args.rowId);
  if (row === null || row.ownerId !== ownerId || row.deletedAt === undefined) {
    throwDomain(new NotFoundError({ message: "ゴミ箱にその記録はありません", resource: "記録" }));
  }
  await ctx.db.delete("rows", args.rowId);
  return null;
}
