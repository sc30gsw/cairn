import { v } from "convex/values";

import { ownerMutation } from "../../lib/ownerFunctions";
import { unflag as unflagReview } from "../../services/reviews/unflag";

export const unflag = ownerMutation({
  args: { rowId: v.id("rows") },
  handler: async (ctx, args) => unflagReview(ctx, ctx.ownerId, args),
  returns: v.null(),
});
