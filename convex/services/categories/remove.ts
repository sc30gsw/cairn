import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { ConflictError } from "../../lib/errors";
import { throwDomain } from "../../lib/ownerFunctions";
import { requireOwnedCategory } from "../items/helpers";

export async function remove(
  ctx: MutationCtx,
  ownerId: string,
  args: { categoryId: Id<"categories"> },
): Promise<null> {
  await requireOwnedCategory(ctx, ownerId, args.categoryId);
  const items = await ctx.db
    .query("items")
    .withIndex("by_category", (q) => q.eq("categoryId", args.categoryId))
    .collect();
  if (items.length > 0) {
    throwDomain(new ConflictError({ message: "項目が残っているカテゴリは消せません" }));
  }
  await ctx.db.delete("categories", args.categoryId);
  return null;
}
