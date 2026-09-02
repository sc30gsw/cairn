import { v } from "convex/values";

import { ownerMutation } from "../../lib/ownerFunctions";
import { flag as flagReview } from "../../services/reviews/flag";

export const flag = ownerMutation({
  args: { dueJst: v.optional(v.string()), rowId: v.id("rows"), todayJst: v.string() },
  handler: async (ctx, args) => flagReview(ctx, ctx.ownerId, args),
  returns: v.null(),
});
