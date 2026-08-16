import type { QueryCtx } from "../../_generated/server";

export async function list(ctx: QueryCtx, ownerId: string) {
  const categories = await ctx.db
    .query("categories")
    .withIndex("by_owner_and_sortOrder", (q) => q.eq("ownerId", ownerId))
    .collect();
  return categories.map((category) => ({
    _id: category._id,
    name: category.name,
    sortOrder: category.sortOrder,
  }));
}
