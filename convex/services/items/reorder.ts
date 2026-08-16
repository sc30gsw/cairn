import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { ValidationFailedError } from "../../lib/errors";
import { throwDomain } from "../../lib/ownerFunctions";
import { requireOwnedCategory } from "./helpers";

export async function reorder(
  ctx: MutationCtx,
  ownerId: string,
  args: { categoryId: Id<"categories">; orderedItemIds: Id<"items">[] },
): Promise<null> {
  await requireOwnedCategory(ctx, ownerId, args.categoryId);
  const items = await ctx.db
    .query("items")
    .withIndex("by_category", (q) => q.eq("categoryId", args.categoryId))
    .collect();
  const owned = items.filter((item) => item.ownerId === ownerId);
  const ownedIds = new Set(owned.map((item) => item._id));
  if (args.orderedItemIds.length !== owned.length) {
    throwDomain(new ValidationFailedError({ message: "項目の並べ替えが不正です" }));
  }
  for (const itemId of args.orderedItemIds) {
    if (!ownedIds.has(itemId)) {
      throwDomain(new ValidationFailedError({ message: "項目の並べ替えが不正です" }));
    }
  }
  await Promise.all(
    args.orderedItemIds.map((itemId, sortOrder) => ctx.db.patch("items", itemId, { sortOrder })),
  );
  return null;
}
