import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { ConflictError, ValidationFailedError } from "../../lib/errors";
import { throwDomain } from "../../lib/ownerFunctions";
import { nextSortOrder, requireOwnedCategory } from "./helpers";

export async function create(
  ctx: MutationCtx,
  ownerId: string,
  args: { categoryId: Id<"categories">; name: string },
): Promise<Id<"items">> {
  await requireOwnedCategory(ctx, ownerId, args.categoryId);
  if (args.name.trim() === "") {
    throwDomain(new ValidationFailedError({ message: "項目名は必須です" }));
  }
  const duplicate = await ctx.db
    .query("items")
    .withIndex("by_owner_and_name", (q) => q.eq("ownerId", ownerId).eq("name", args.name))
    .unique();
  if (duplicate !== null) {
    throwDomain(new ConflictError({ message: "同じ名前の項目があります" }));
  }
  const sortOrder = await nextSortOrder(ctx, ownerId, args.categoryId);
  return await ctx.db.insert("items", {
    categoryId: args.categoryId,
    name: args.name,
    ownerId,
    sortOrder,
  });
}
