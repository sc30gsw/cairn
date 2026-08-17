import { v } from "convex/values";

import { ownerMutation } from "../../lib/ownerFunctions";
import { saveWeekly as saveWeeklyGoal } from "../../services/goals/saveWeekly";

export const saveWeekly = ownerMutation({
  args: { dailyFloorMinutes: v.number(), days: v.number(), weekStartJst: v.string() },
  handler: async (ctx, args) => saveWeeklyGoal(ctx, ctx.ownerId, args),
  returns: v.null(),
});
