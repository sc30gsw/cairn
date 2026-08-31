import { v } from "convex/values";

import { ownerMutation } from "../../lib/ownerFunctions";
import { createLane as createMethodLane } from "../../services/methods/createLane";

export const createLane = ownerMutation({
  args: { name: v.string() },
  handler: async (ctx, args) => createMethodLane(ctx, ctx.ownerId, args),
  returns: v.id("methodLanes"),
});
