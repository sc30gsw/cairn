import { v } from "convex/values";

import { ownerMutation } from "../../lib/ownerFunctions";
import { markAllRead as markAllNotificationsRead } from "../../services/notifications/markAllRead";

export const markAllRead = ownerMutation({
  args: {},
  handler: async (ctx) => markAllNotificationsRead(ctx, ctx.ownerId),
  returns: v.null(),
});
