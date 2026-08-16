import type { MutationCtx } from "../../_generated/server";
import { backfillItemSortOrders } from "../catalog/backfillItemSortOrders";

export async function backfillAllItemSortOrders(ctx: MutationCtx): Promise<number> {
  const categories = await ctx.db.query("categories").collect();
  const ownerIds = [...new Set(categories.map((category) => category.ownerId))];
  await Promise.all(ownerIds.map((ownerId) => backfillItemSortOrders(ctx, ownerId)));
  return ownerIds.length;
}
