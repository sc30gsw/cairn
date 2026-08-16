import { v } from "convex/values";

import { ownerQuery } from "../../lib/ownerFunctions";
import { examGoalDtoValidator } from "../../lib/validators";
import { getExam as getExamGoal } from "../../services/goals/getExam";

export const getExam = ownerQuery({
  args: { todayJst: v.string() },
  handler: async (ctx, args) => getExamGoal(ctx, ctx.ownerId, args),
  returns: examGoalDtoValidator,
});
