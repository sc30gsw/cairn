import { v } from "convex/values";

import { ownerQuery } from "../../lib/ownerFunctions";
import { weekBreakdownValidator } from "../../lib/validators";
import { weekBreakdown as getWeekBreakdown } from "../../services/history/weekBreakdown";

export const weekBreakdown = ownerQuery({
  args: { dateJst: v.string() },
  handler: async (ctx, args) => getWeekBreakdown(ctx, ctx.ownerId, args),
  returns: weekBreakdownValidator,
});
