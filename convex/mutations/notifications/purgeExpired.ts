import { v } from "convex/values";

import { internalMutation } from "../../_generated/server";
import { purgeExpired as purgeExpiredNotifications } from "../../services/notifications/purgeExpired";

export const purgeExpired = internalMutation({
  args: { now: v.optional(v.number()) },
  handler: async (ctx, args) => purgeExpiredNotifications(ctx, args),
  returns: v.null(),
});
