import { groupBy } from "remeda";

import type { MutationCtx } from "../../_generated/server";
import { compareItemsBySortOrder } from "../../lib/itemSort";

export async function backfillItemSortOrders(ctx: MutationCtx, ownerId: string): Promise<void> {
  const items = await ctx.db
    .query("items")
    .withIndex("by_owner_and_name", (q) => q.eq("ownerId", ownerId))
    .collect();
  const byCategory = groupBy(
    items.filter((item) => item.categoryId !== undefined),
    (item) => item.categoryId!,
  );
  await Promise.all(
    Object.values(byCategory).flatMap((categoryItems) => {
      const ordered = categoryItems.toSorted(compareItemsBySortOrder);
      return ordered.map((item, sortOrder) => {
        if (item.sortOrder === sortOrder) {
          return Promise.resolve();
        }
        return ctx.db.patch("items", item._id, { sortOrder });
      });
    }),
  );
}
