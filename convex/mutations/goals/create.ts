import { v } from "convex/values";

import { ownerMutation } from "../../lib/ownerFunctions";
import { goalInputValidator } from "../../lib/validators";
import { create as createGoal } from "../../services/goals/create";

export const create = ownerMutation({
  args: { goal: goalInputValidator },
  handler: async (ctx, args) => createGoal(ctx, ctx.ownerId, args),
  returns: v.id("goals"),
});
