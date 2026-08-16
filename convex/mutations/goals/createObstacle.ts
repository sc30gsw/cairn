import { v } from "convex/values";

import { ownerMutation } from "../../lib/ownerFunctions";
import { createObstacle as createObstaclePlan } from "../../services/goals/createObstacle";

export const createObstacle = ownerMutation({
  args: { ifText: v.string(), thenText: v.string() },
  handler: async (ctx, args) => createObstaclePlan(ctx, ctx.ownerId, args),
  returns: v.id("obstaclePlans"),
});
