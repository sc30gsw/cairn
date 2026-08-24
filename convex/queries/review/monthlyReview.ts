import { v } from "convex/values";

import { ownerQuery } from "../../lib/ownerFunctions";
import { monthlyReviewValidator } from "../../lib/validators";
import { monthlyReview as getMonthlyReview } from "../../services/review/monthlyReview";

export const monthlyReview = ownerQuery({
  args: { todayJst: v.string(), yearMonth: v.string() },
  handler: async (ctx, args) => getMonthlyReview(ctx, ctx.ownerId, args),
  returns: monthlyReviewValidator,
});
