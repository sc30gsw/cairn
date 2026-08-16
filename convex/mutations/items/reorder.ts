import { v } from "convex/values";

import { ownerMutation } from "../../lib/ownerFunctions";
import { reorder as reorderItems } from "../../services/items/reorder";

export const reorder = ownerMutation({
  args: {
    categoryId: v.id("categories"),
    orderedItemIds: v.array(v.id("items")),
  },
  handler: async (ctx, args) => reorderItems(ctx, ctx.ownerId, args),
  returns: v.null(),
});
