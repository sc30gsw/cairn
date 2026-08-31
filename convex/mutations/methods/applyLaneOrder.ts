import { v } from "convex/values";

import { ownerMutation } from "../../lib/ownerFunctions";
import { applyLaneOrder as applyMethodLaneOrder } from "../../services/methods/applyLaneOrder";

export const applyLaneOrder = ownerMutation({
  args: {
    orderedLaneIds: v.array(v.id("methodLanes")),
  },
  handler: async (ctx, args) => applyMethodLaneOrder(ctx, ctx.ownerId, args),
  returns: v.null(),
});
