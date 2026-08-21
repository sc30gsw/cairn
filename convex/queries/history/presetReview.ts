import { v } from "convex/values";

import { ownerQuery } from "../../lib/ownerFunctions";
import { presetReviewValidator } from "../../lib/validators";
import { presetReview as getPresetReview } from "../../services/history/presetReview";

export const presetReview = ownerQuery({
  args: { todayJst: v.string() },
  handler: async (ctx, args) => getPresetReview(ctx, ctx.ownerId, args),
  returns: presetReviewValidator,
});
