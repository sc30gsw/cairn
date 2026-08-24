import { v } from "convex/values";

import { ownerMutation } from "../../lib/ownerFunctions";
import { markRead as markNotificationsRead } from "../../services/notifications/markRead";

export const markRead = ownerMutation({
  args: { notificationIds: v.array(v.id("notifications")) },
  handler: async (ctx, args) => markNotificationsRead(ctx, ctx.ownerId, args),
  returns: v.null(),
});
