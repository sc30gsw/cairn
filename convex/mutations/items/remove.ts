import { v } from "convex/values";

import { ownerMutation } from "../../lib/ownerFunctions";
import { remove as removeItem } from "../../services/items/remove";

export const remove = ownerMutation({
  args: { itemId: v.id("items") },
  handler: async (ctx, args) => removeItem(ctx, ctx.ownerId, args),
  returns: v.null(),
});
