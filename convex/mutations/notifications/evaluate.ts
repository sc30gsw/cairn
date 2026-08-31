import { v } from "convex/values";

import { internalMutation } from "../../_generated/server";
import { evaluate as evaluateNotifications } from "../../services/notifications/evaluate";

export const evaluate = internalMutation({
  args: { now: v.optional(v.number()) },
  handler: async (ctx, args) => evaluateNotifications(ctx, args),
  returns: v.null(),
});
