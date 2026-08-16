import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { ConflictError, ValidationFailedError } from "../../lib/errors";
import { throwDomain } from "../../lib/ownerFunctions";
import { requireOwnedCategory } from "../items/helpers";

export async function rename(
  ctx: MutationCtx,
  ownerId: string,
  args: { categoryId: Id<"categories">; name: string },
): Promise<null> {
  await requireOwnedCategory(ctx, ownerId, args.categoryId);
  const name = args.name.trim();
  if (name === "") {
    throwDomain(new ValidationFailedError({ message: "カテゴリ名は必須です" }));
  }
  const duplicate = await ctx.db
    .query("categories")
    .withIndex("by_owner_and_name", (q) => q.eq("ownerId", ownerId).eq("name", name))
    .unique();
  if (duplicate !== null && duplicate._id !== args.categoryId) {
    throwDomain(new ConflictError({ message: "同じ名前のカテゴリがあります" }));
  }
  await ctx.db.patch("categories", args.categoryId, { name });
  return null;
}
