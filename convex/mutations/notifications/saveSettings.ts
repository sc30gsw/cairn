import { v } from "convex/values";

import { ownerMutation } from "../../lib/ownerFunctions";
import { notificationTriggerPrefsValidator } from "../../lib/validators";
import { saveSettings as saveNotificationSettings } from "../../services/notifications/saveSettings";

export const saveSettings = ownerMutation({
  args: {
    enabled: v.boolean(),
    eveningHourJst: v.number(),
    triggers: notificationTriggerPrefsValidator,
  },
  handler: async (ctx, args) => saveNotificationSettings(ctx, ctx.ownerId, args),
  returns: v.id("notificationSettings"),
});
