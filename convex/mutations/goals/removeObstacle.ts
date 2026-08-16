import { v } from "convex/values";

import { ownerMutation } from "../../lib/ownerFunctions";
import { removeObstacle as removeObstaclePlan } from "../../services/goals/removeObstacle";

export const removeObstacle = ownerMutation({
  args: { planId: v.id("obstaclePlans") },
  handler: async (ctx, args) => removeObstaclePlan(ctx, ctx.ownerId, args),
  returns: v.null(),
});
