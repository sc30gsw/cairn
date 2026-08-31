import { v } from "convex/values";

import { ownerMutation } from "../../lib/ownerFunctions";
import { removeLane as removeMethodLane } from "../../services/methods/removeLane";

export const removeLane = ownerMutation({
  args: { laneId: v.id("methodLanes") },
  handler: async (ctx, args) => removeMethodLane(ctx, ctx.ownerId, args),
  returns: v.null(),
});
