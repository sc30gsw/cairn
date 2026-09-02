import { v } from "convex/values";

import { internalMutation } from "../../_generated/server";
import { pruneWebPushSubscriptions as prune } from "../../services/notifications/pruneWebPushSubscriptions";

export const pruneWebPushSubscriptions = internalMutation({
  args: { subscriptionIds: v.array(v.id("pushSubscriptions")) },
  handler: async (ctx, args) => prune(ctx, args),
  returns: v.null(),
});
