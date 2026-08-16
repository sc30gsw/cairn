import { v } from "convex/values";

import { internalMutation } from "./_generated/server";
import { backfillItemSortOrders } from "./ensureCatalog";

export const backfillAllItemSortOrders = internalMutation({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db.query("items").collect();
    const ownerIds = [...new Set(items.map((item) => item.ownerId))];
    await Promise.all(ownerIds.map((ownerId) => backfillItemSortOrders(ctx, ownerId)));
    return ownerIds.length;
  },
  returns: v.number(),
});
