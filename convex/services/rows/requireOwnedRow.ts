import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { NotFoundError } from "../../lib/errors";
import { throwDomain } from "../../lib/ownerFunctions";

export async function requireOwnedRow(ctx: MutationCtx, ownerId: string, rowId: Id<"rows">) {
  const row = await ctx.db.get("rows", rowId);
  if (row === null || row.ownerId !== ownerId || row.deletedAt !== undefined) {
    throwDomain(new NotFoundError({ message: "記録が見つかりません", resource: "記録" }));
  }
  return row;
}
