import { v } from "convex/values";

import { ownerMutation } from "../../lib/ownerFunctions";
import { laneMethodOrderValidator } from "../../lib/validators";
import { applyMethodOrder as applyCatalogMethodOrder } from "../../services/methods/applyMethodOrder";

export const applyMethodOrder = ownerMutation({
  args: {
    updates: v.array(laneMethodOrderValidator),
  },
  handler: async (ctx, args) => applyCatalogMethodOrder(ctx, ctx.ownerId, args),
  returns: v.null(),
});
