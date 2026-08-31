import { v } from "convex/values";

import { ownerMutation } from "../../lib/ownerFunctions";
import { createMethod as createCatalogMethod } from "../../services/methods/createMethod";

export const createMethod = ownerMutation({
  args: { laneId: v.id("methodLanes"), name: v.string() },
  handler: async (ctx, args) => createCatalogMethod(ctx, ctx.ownerId, args),
  returns: v.id("methods"),
});
