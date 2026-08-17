import { v } from "convex/values";

import { ownerMutation } from "../../lib/ownerFunctions";
import { ensureWeekSnapshot as ensureGoalWeekSnapshot } from "../../services/goals/ensureWeekSnapshot";

export const ensureWeekSnapshot = ownerMutation({
  args: { weekStartJst: v.string() },
  handler: async (ctx, args) => ensureGoalWeekSnapshot(ctx, ctx.ownerId, args),
  returns: v.null(),
});
