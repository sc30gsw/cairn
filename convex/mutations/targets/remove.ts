import { v } from "convex/values";

import { ownerMutation } from "../../lib/ownerFunctions";
import { remove as removeTarget } from "../../services/targets/remove";

export const remove = ownerMutation({
  args: { targetId: v.id("targets") },
  handler: async (ctx, args) => removeTarget(ctx, ctx.ownerId, args),
  returns: v.null(),
});
