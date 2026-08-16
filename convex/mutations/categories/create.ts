import { v } from "convex/values";

import { ownerMutation } from "../../lib/ownerFunctions";
import { create as createCategory } from "../../services/categories/create";

export const create = ownerMutation({
  args: { name: v.string() },
  handler: async (ctx, args) => createCategory(ctx, ctx.ownerId, args),
  returns: v.id("categories"),
});
