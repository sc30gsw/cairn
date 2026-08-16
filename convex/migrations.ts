import { v } from "convex/values";

import { internalMutation } from "./_generated/server";
import { backfillItemSortOrders } from "./ensureCatalog";

export const backfillAllItemSortOrders = internalMutation({
  args: {},
  handler: async (ctx) => {
    const categories = await ctx.db.query("categories").collect();
    const ownerIds = [...new Set(categories.map((category) => category.ownerId))];
    await Promise.all(ownerIds.map((ownerId) => backfillItemSortOrders(ctx, ownerId)));
    return ownerIds.length;
  },
  returns: v.number(),
});
