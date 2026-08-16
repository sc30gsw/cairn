import type { Id } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";
import { NotFoundError } from "../../lib/errors";
import { throwDomain } from "../../lib/ownerFunctions";

export async function requireOwnedCategory(
  ctx: MutationCtx | QueryCtx,
  ownerId: string,
  categoryId: Id<"categories">,
) {
  const category = await ctx.db.get("categories", categoryId);
  if (category === null || category.ownerId !== ownerId) {
    throwDomain(new NotFoundError({ message: "カテゴリが見つかりません", resource: "カテゴリ" }));
  }
  return category;
}

export async function nextSortOrder(
  ctx: MutationCtx,
  ownerId: string,
  categoryId: Id<"categories">,
): Promise<number> {
  const items = await ctx.db
    .query("items")
    .withIndex("by_category_and_sortOrder", (q) => q.eq("categoryId", categoryId))
    .collect();
  const owned = items.filter((item) => item.ownerId === ownerId);
  if (owned.length === 0) {
    return 0;
  }
  return Math.max(...owned.map((item) => item.sortOrder ?? -1)) + 1;
}
