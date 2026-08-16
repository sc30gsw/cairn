import { v } from "convex/values";

import { ownerMutation } from "../../lib/ownerFunctions";
import { rename as renameCategory } from "../../services/categories/rename";

export const rename = ownerMutation({
  args: { categoryId: v.id("categories"), name: v.string() },
  handler: async (ctx, args) => renameCategory(ctx, ctx.ownerId, args),
  returns: v.null(),
});
