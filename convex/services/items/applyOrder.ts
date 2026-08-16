import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { ValidationFailedError } from "../../lib/errors";
import { applyItemOrderToList, validateCategoryOrderUpdates } from "../../lib/itemOrder";
import { throwDomain } from "../../lib/ownerFunctions";
import { requireOwnedCategory } from "./helpers";

export async function applyOrder(
  ctx: MutationCtx,
  ownerId: string,
  args: { updates: { categoryId: Id<"categories">; orderedItemIds: Id<"items">[] }[] },
): Promise<null> {
  if (args.updates.length === 0) {
    return null;
  }

  const seenItemIds = new Set<Id<"items">>();
  const categoryIds = [...new Set(args.updates.map((update) => update.categoryId))];
  await Promise.all(
    categoryIds.map((categoryId) => requireOwnedCategory(ctx, ownerId, categoryId)),
  );
  for (const update of args.updates) {
    for (const itemId of update.orderedItemIds) {
      if (seenItemIds.has(itemId)) {
        throwDomain(new ValidationFailedError({ message: "項目の並べ替えが不正です" }));
      }
      seenItemIds.add(itemId);
    }
  }

  const items = await ctx.db
    .query("items")
    .withIndex("by_owner_and_name", (q) => q.eq("ownerId", ownerId))
    .collect();
  const itemById = new Map(items.map((item) => [item._id, item]));

  for (const update of args.updates) {
    for (const itemId of update.orderedItemIds) {
      const item = itemById.get(itemId);
      if (item === undefined) {
        throwDomain(new ValidationFailedError({ message: "項目の並べ替えが不正です" }));
      }
    }
  }

  const validationError = validateCategoryOrderUpdates(
    items.map((item) => ({ _id: item._id, categoryId: item.categoryId })),
    args.updates,
  );
  if (validationError !== null) {
    throwDomain(new ValidationFailedError({ message: validationError }));
  }

  const listDto = applyItemOrderToList(
    items.flatMap((item) =>
      item.categoryId === undefined
        ? []
        : [
            {
              _id: item._id,
              categoryId: item.categoryId,
              name: item.name,
              sortOrder: item.sortOrder ?? Number.MAX_SAFE_INTEGER,
            },
          ],
    ),
    args.updates,
  );
  const nextById = new Map(listDto.map((item) => [item._id, item]));

  await Promise.all(
    [...seenItemIds].map(async (itemId) => {
      const item = itemById.get(itemId);
      const next = nextById.get(itemId);
      if (item === undefined || next === undefined) {
        return;
      }
      if (item.categoryId === next.categoryId && item.sortOrder === next.sortOrder) {
        return;
      }
      await ctx.db.patch("items", itemId, {
        categoryId: next.categoryId,
        sortOrder: next.sortOrder,
      });
    }),
  );
  return null;
}
