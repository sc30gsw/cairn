import { v } from "convex/values";

import { internalQuery } from "../../_generated/server";
import { webPushDeliveryValidator } from "../../lib/validators";
import { webPushDelivery as loadWebPushDelivery } from "../../services/notifications/webPushDelivery";

export const webPushDelivery = internalQuery({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => loadWebPushDelivery(ctx, args),
  returns: webPushDeliveryValidator,
});
