import { v } from "convex/values";

import { internalQuery } from "../../_generated/server";
import { slackDeliveryValidator } from "../../lib/validators";
import { deliveryPayload as notificationDeliveryPayload } from "../../services/notifications/deliveryPayload";

//? internalQuery。Webhook URL を含むので公開 query では絶対に返さない(§9.2)。
export const deliveryPayload = internalQuery({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => notificationDeliveryPayload(ctx, args.notificationId),
  returns: v.union(slackDeliveryValidator, v.null()),
});
