import { v } from "convex/values";

import { ownerMutation } from "../../lib/ownerFunctions";
import { ensure as ensureCatalogService } from "../../services/catalog/ensure";

export const ensure = ownerMutation({
  args: {},
  handler: async (ctx) => ensureCatalogService(ctx, ctx.ownerId),
  returns: v.null(),
});
