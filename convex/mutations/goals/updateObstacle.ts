import { v } from "convex/values";

import { ownerMutation } from "../../lib/ownerFunctions";
import { updateObstacle as updateObstaclePlan } from "../../services/goals/updateObstacle";

export const updateObstacle = ownerMutation({
  args: { ifText: v.string(), planId: v.id("obstaclePlans"), thenText: v.string() },
  handler: async (ctx, args) => updateObstaclePlan(ctx, ctx.ownerId, args),
  returns: v.null(),
});
