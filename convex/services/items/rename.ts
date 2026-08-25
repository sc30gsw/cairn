import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { ConflictError, ValidationFailedError } from "../../lib/errors";
import { throwDomain } from "../../lib/ownerFunctions";
import { nextSortOrder, requireOwnedCategory, requireOwnedItem } from "./helpers";

export async function rename(
  ctx: MutationCtx,
  ownerId: string,
  args: { categoryId: Id<"categories">; itemId: Id<"items">; name: string },
): Promise<null> {
  const item = await requireOwnedItem(ctx, ownerId, args.itemId);
  await requireOwnedCategory(ctx, ownerId, args.categoryId);
  const name = args.name.trim();
  if (name === "") {
    throwDomain(new ValidationFailedError({ message: "項目名は必須です" }));
  }
  const duplicate = await ctx.db
    .query("items")
    .withIndex("by_owner_and_name", (q) => q.eq("ownerId", ownerId).eq("name", name))
    .unique();
  if (duplicate !== null && duplicate._id !== args.itemId) {
    throwDomain(new ConflictError({ message: "同じ名前の項目があります" }));
  }
  const movedCategory = item.categoryId !== args.categoryId;
  const sortOrder = movedCategory
    ? await nextSortOrder(ctx, ownerId, args.categoryId)
    : (item.sortOrder ?? (await nextSortOrder(ctx, ownerId, args.categoryId)));
  await ctx.db.patch("items", args.itemId, {
    categoryId: args.categoryId,
    name,
    sortOrder,
  });
  return null;
}
