import { v } from "convex/values";

import { internalMutation } from "../../_generated/server";
import { recomputeMasteryProgressForOwner } from "../../services/goals/recomputeMasteryProgressForOwner";

export const recomputeMasteryProgress = internalMutation({
  args: { ownerId: v.string() },
  handler: async (ctx, args) => recomputeMasteryProgressForOwner(ctx, args.ownerId),
  returns: v.null(),
});
