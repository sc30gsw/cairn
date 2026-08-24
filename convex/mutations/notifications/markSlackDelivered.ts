import { v } from "convex/values";

import { internalMutation } from "../../_generated/server";
import { markSlackDelivered as recordSlackDelivery } from "../../services/notifications/markSlackDelivered";

export const markSlackDelivered = internalMutation({
  args: {
    error: v.optional(v.string()),
    notificationId: v.id("notifications"),
  },
  handler: async (ctx, args) => recordSlackDelivery(ctx, args),
  returns: v.null(),
});
