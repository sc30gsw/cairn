import { v } from "convex/values";

import { ownerMutation } from "../../lib/ownerFunctions";
import { updateMethod as updateCatalogMethod } from "../../services/methods/updateMethod";

export const updateMethod = ownerMutation({
  args: {
    bodyText: v.string(),
    completionHtml: v.string(),
    memoHtml: v.string(),
    methodId: v.id("methods"),
    name: v.string(),
  },
  handler: async (ctx, args) => updateCatalogMethod(ctx, ctx.ownerId, args),
  returns: v.null(),
});
