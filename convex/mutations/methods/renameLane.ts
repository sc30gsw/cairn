import { v } from "convex/values";

import { ownerMutation } from "../../lib/ownerFunctions";
import { renameLane as renameMethodLane } from "../../services/methods/renameLane";

export const renameLane = ownerMutation({
  args: { laneId: v.id("methodLanes"), name: v.string() },
  handler: async (ctx, args) => renameMethodLane(ctx, ctx.ownerId, args),
  returns: v.null(),
});
