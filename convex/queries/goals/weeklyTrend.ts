import { v } from "convex/values";

import { ownerQuery } from "../../lib/ownerFunctions";
import { weeklyTrendWeekValidator } from "../../lib/validators";
import { weeklyTrend as getWeeklyTrend } from "../../services/goals/weeklyTrend";

export const weeklyTrend = ownerQuery({
  args: { todayJst: v.string() },
  handler: async (ctx, args) => getWeeklyTrend(ctx, ctx.ownerId, args),
  returns: v.array(weeklyTrendWeekValidator),
});
