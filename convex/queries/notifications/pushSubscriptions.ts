import { v } from "convex/values";

import { ownerQuery } from "../../lib/ownerFunctions";
import { pushSubscriptionDtoValidator } from "../../lib/validators";
import { listPushSubscriptions } from "../../services/notifications/listPushSubscriptions";

export const pushSubscriptions = ownerQuery({
  args: {},
  handler: async (ctx) => listPushSubscriptions(ctx, ctx.ownerId),
  returns: v.array(pushSubscriptionDtoValidator),
});
