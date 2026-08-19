import { v } from "convex/values";

import { ownerQuery } from "../../lib/ownerFunctions";
import { dayBreakdownValidator } from "../../lib/validators";
import { dayBreakdown as getDayBreakdown } from "../../services/history/dayBreakdown";

export const dayBreakdown = ownerQuery({
  args: { dateJst: v.string(), todayJst: v.string() },
  handler: async (ctx, args) => getDayBreakdown(ctx, ctx.ownerId, args),
  returns: dayBreakdownValidator,
});
