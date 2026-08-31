import { v } from "convex/values";

import { ownerMutation } from "../../lib/ownerFunctions";
import { removeMethod as removeCatalogMethod } from "../../services/methods/removeMethod";

export const removeMethod = ownerMutation({
  args: { methodId: v.id("methods") },
  handler: async (ctx, args) => removeCatalogMethod(ctx, ctx.ownerId, args),
  returns: v.null(),
});
