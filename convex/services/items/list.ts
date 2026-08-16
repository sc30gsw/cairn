import { flatMap, map, pipe } from "remeda";

import type { QueryCtx } from "../../_generated/server";

export async function list(ctx: QueryCtx, ownerId: string) {
  const items = await ctx.db
    .query("items")
    .withIndex("by_owner_and_name", (q) => q.eq("ownerId", ownerId))
    .collect();
  return pipe(
    items,
    flatMap((item) => {
      if (item.categoryId === undefined) {
        return [];
      }
      return [
        {
          _id: item._id,
          categoryId: item.categoryId,
          name: item.name,
          sortKey: item.sortOrder ?? Number.MAX_SAFE_INTEGER,
          sortOrder: item.sortOrder,
        },
      ];
    }),
    (list) =>
      list.toSorted(
        (left, right) => left.sortKey - right.sortKey || left.name.localeCompare(right.name, "ja"),
      ),
    map(({ sortKey: _sortKey, sortOrder, ...item }, index) => ({
      ...item,
      sortOrder: sortOrder ?? index,
    })),
  );
}
