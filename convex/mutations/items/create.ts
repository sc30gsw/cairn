import { v } from "convex/values";

import { ownerMutation } from "../../lib/ownerFunctions";
import { create as createItem } from "../../services/items/create";

export const create = ownerMutation({
  args: {
    categoryId: v.id("categories"),
    name: v.string(),
  },
  handler: async (ctx, args) => createItem(ctx, ctx.ownerId, args),
  returns: v.id("items"),
});
