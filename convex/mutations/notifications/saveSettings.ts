import { v } from "convex/values";

import { ownerMutation } from "../../lib/ownerFunctions";
import { notificationTriggerPrefsValidator } from "../../lib/validators";
import { saveSettings as saveNotificationSettings } from "../../services/notifications/saveSettings";

export const saveSettings = ownerMutation({
  args: {
    enabled: v.boolean(),
    eveningHourJst: v.number(),
    quietFromHourJst: v.number(),
    quietToHourJst: v.number(),
    slackEnabled: v.boolean(),
    //? 未指定 = 既存の URL を保つ。空文字は受け取らない(解除は disconnectSlack)。
    slackWebhookUrl: v.optional(v.string()),
    triggers: notificationTriggerPrefsValidator,
  },
  handler: async (ctx, args) => saveNotificationSettings(ctx, ctx.ownerId, args),
  returns: v.id("notificationSettings"),
});
