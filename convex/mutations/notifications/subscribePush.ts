import { v } from "convex/values";

import { ownerMutation } from "../../lib/ownerFunctions";
import { pushSubscriptionInputValidator } from "../../lib/validators";
import { subscribePush as subscribeOwnerPush } from "../../services/notifications/subscribePush";

export const subscribePush = ownerMutation({
  args: pushSubscriptionInputValidator.fields,
  handler: async (ctx, args) => subscribeOwnerPush(ctx, ctx.ownerId, args),
  returns: v.null(),
});
