import { v } from "convex/values";

import { internalMutation } from "../../_generated/server";
import { autoStopTimers as autoStopRowTimers } from "../../services/rows/autoStopTimers";

//? cron に identity は無いので ownerMutation は使えない。purgeExpired と同じ形(CVX-05)。
export const autoStopTimers = internalMutation({
  args: { now: v.optional(v.number()) },
  handler: async (ctx, args) => autoStopRowTimers(ctx, args),
  returns: v.null(),
});
