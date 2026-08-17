import { v } from "convex/values";

import { ownerMutation } from "../../lib/ownerFunctions";
import { setVolumeProgress as setGoalVolumeProgress } from "../../services/goals/setVolumeProgress";

export const setVolumeProgress = ownerMutation({
  args: { currentAmount: v.number(), goalId: v.id("goals") },
  handler: async (ctx, args) => setGoalVolumeProgress(ctx, ctx.ownerId, args),
  returns: v.null(),
});
