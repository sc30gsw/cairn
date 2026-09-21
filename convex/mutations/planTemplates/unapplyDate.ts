import { v } from "convex/values";

import { ownerMutation } from "../../lib/ownerFunctions";
import { presetUnapplyResultValidator } from "../../lib/validators";
import { unapplyDate as clearAppliedDate } from "../../services/plan/templates";

export const unapplyDate = ownerMutation({
  args: {
    dateJst: v.string(),
    todayJst: v.string(),
  },
  handler: async (ctx, args) => clearAppliedDate(ctx, ctx.ownerId, args),
  returns: presetUnapplyResultValidator,
});
