import { v } from "convex/values";

import { ownerQuery } from "../../lib/ownerFunctions";
import { monthBreakdownValidator } from "../../lib/validators";
import { monthBreakdown as getMonthBreakdown } from "../../services/history/monthBreakdown";

export const monthBreakdown = ownerQuery({
  args: { todayJst: v.string(), yearMonth: v.string() },
  handler: async (ctx, args) => getMonthBreakdown(ctx, ctx.ownerId, args),
  returns: monthBreakdownValidator,
});
