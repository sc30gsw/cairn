import { v } from "convex/values";

import { ownerMutation } from "../../lib/ownerFunctions";
import { goalInputValidator } from "../../lib/validators";
import { update as updateGoal } from "../../services/goals/update";

export const update = ownerMutation({
  args: { goal: goalInputValidator, goalId: v.id("goals"), weekStartJst: v.string() },
  handler: async (ctx, args) => updateGoal(ctx, ctx.ownerId, args),
  returns: v.null(),
});
