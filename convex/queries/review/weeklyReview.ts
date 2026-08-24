import { v } from "convex/values";

import { ownerQuery } from "../../lib/ownerFunctions";
import { weeklyReviewValidator } from "../../lib/validators";
import { weeklyReview as getWeeklyReview } from "../../services/review/weeklyReview";

export const weeklyReview = ownerQuery({
  args: { todayJst: v.string(), weekStartJst: v.string() },
  handler: async (ctx, args) => getWeeklyReview(ctx, ctx.ownerId, args),
  returns: weeklyReviewValidator,
});
