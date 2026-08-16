import { v } from "convex/values";

import { internalMutation } from "../../_generated/server";
import { backfillAllItemSortOrders as backfillAllItemSortOrdersService } from "../../services/migrations/backfillAllItemSortOrders";

export const backfillAllItemSortOrders = internalMutation({
  args: {},
  handler: async (ctx) => backfillAllItemSortOrdersService(ctx),
  returns: v.number(),
});
