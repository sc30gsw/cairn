import { v } from "convex/values";

import { ownerMutation } from "../../lib/ownerFunctions";
import { remove as removeGoal } from "../../services/goals/remove";

export const remove = ownerMutation({
  args: { goalId: v.id("goals") },
  handler: async (ctx, args) => removeGoal(ctx, ctx.ownerId, args),
  returns: v.number(),
});
