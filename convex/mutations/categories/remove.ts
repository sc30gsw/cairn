import { v } from "convex/values";

import { ownerMutation } from "../../lib/ownerFunctions";
import { remove as removeCategory } from "../../services/categories/remove";

export const remove = ownerMutation({
  args: { categoryId: v.id("categories") },
  handler: async (ctx, args) => removeCategory(ctx, ctx.ownerId, args),
  returns: v.null(),
});
