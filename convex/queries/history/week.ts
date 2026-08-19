import { v } from "convex/values";

import { ownerQuery } from "../../lib/ownerFunctions";
import { historyWeekValidator } from "../../lib/validators";
import { week as getWeek } from "../../services/history/week";

export const week = ownerQuery({
  args: { dateJst: v.string(), todayJst: v.string() },
  handler: async (ctx, args) => getWeek(ctx, ctx.ownerId, args),
  returns: historyWeekValidator,
});
