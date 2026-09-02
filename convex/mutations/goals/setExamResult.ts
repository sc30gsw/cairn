import { v } from "convex/values";

import { ownerMutation } from "../../lib/ownerFunctions";
import { examResultValidator } from "../../lib/validators";
import { setExamResult as setGoalExamResult } from "../../services/goals/setExamResult";

export const setExamResult = ownerMutation({
  args: {
    goalId: v.id("goals"),
    result: examResultValidator,
  },
  handler: async (ctx, args) => setGoalExamResult(ctx, ctx.ownerId, args),
  returns: v.null(),
});
