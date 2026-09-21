import { v } from "convex/values";

import { internalMutation } from "../../_generated/server";
import { notifyMissingTomorrowPlan as notify } from "../../services/notifications/notifyMissingTomorrowPlan";

export const notifyMissingTomorrowPlan = internalMutation({
  args: { now: v.optional(v.number()) },
  handler: async (ctx, args) => notify(ctx, args),
  returns: v.null(),
});
