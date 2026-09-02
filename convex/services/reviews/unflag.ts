import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { requireOwnedRow } from "../rows/requireOwnedRow";

//? 印を外す。すでに今日に並んだ復習の記録はそのまま残す（記録は消さない）
export async function unflag(
  ctx: MutationCtx,
  ownerId: string,
  args: Record<"rowId", Id<"rows">>,
): Promise<null> {
  const row = await requireOwnedRow(ctx, ownerId, args.rowId);
  const existing = await ctx.db
    .query("reviewFlags")
    .withIndex("by_sourceRow", (q) => q.eq("sourceRowId", row._id))
    .unique();
  if (existing !== null) {
    await ctx.db.delete("reviewFlags", existing._id);
  }
  return null;
}
