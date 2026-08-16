import { v } from "convex/values";

import { ownerMutation } from "../../lib/ownerFunctions";
import { rename as renameItem } from "../../services/items/rename";

export const rename = ownerMutation({
  args: {
    categoryId: v.id("categories"),
    itemId: v.id("items"),
    name: v.string(),
  },
  handler: async (ctx, args) => renameItem(ctx, ctx.ownerId, args),
  returns: v.null(),
});
