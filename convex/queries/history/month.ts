import { v } from "convex/values";

import { ownerQuery } from "../../lib/ownerFunctions";
import { historyMonthValidator } from "../../lib/validators";
import { month as getMonth } from "../../services/history/month";

export const month = ownerQuery({
  args: { todayJst: v.string(), yearMonth: v.string() },
  handler: async (ctx, args) => getMonth(ctx, ctx.ownerId, args),
  returns: historyMonthValidator,
});
