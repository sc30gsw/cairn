import { v } from "convex/values";

import { ownerMutation } from "../../lib/ownerFunctions";
import { saveExam as saveExamGoal } from "../../services/goals/saveExam";

export const saveExam = ownerMutation({
  args: { examDate: v.string(), maxScore: v.number(), minScore: v.number() },
  handler: async (ctx, args) => saveExamGoal(ctx, ctx.ownerId, args),
  returns: v.null(),
});
