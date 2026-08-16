import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { ConflictError, NotFoundError, ValidationFailedError } from "../../lib/errors";
import { throwDomain } from "../../lib/ownerFunctions";
import { nextSortOrder, requireOwnedCategory } from "./helpers";

export async function rename(
  ctx: MutationCtx,
  ownerId: string,
  args: { categoryId: Id<"categories">; itemId: Id<"items">; name: string },
): Promise<null> {
  const item = await ctx.db.get("items", args.itemId);
  if (item === null || item.ownerId !== ownerId) {
    throwDomain(new NotFoundError({ message: "項目が見つかりません", resource: "項目" }));
  }
  await requireOwnedCategory(ctx, ownerId, args.categoryId);
  if (args.name.trim() === "") {
    throwDomain(new ValidationFailedError({ message: "項目名は必須です" }));
  }
  const duplicate = await ctx.db
    .query("items")
    .withIndex("by_owner_and_name", (q) => q.eq("ownerId", ownerId).eq("name", args.name))
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
    name: args.name,
    sortOrder,
  });
  return null;
}
