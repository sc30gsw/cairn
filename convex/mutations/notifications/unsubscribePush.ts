import { v } from "convex/values";

import { ownerMutation } from "../../lib/ownerFunctions";
import { unsubscribePush as unsubscribeOwnerPush } from "../../services/notifications/unsubscribePush";

export const unsubscribePush = ownerMutation({
  args: { endpoint: v.string() },
  handler: async (ctx, args) => unsubscribeOwnerPush(ctx, ctx.ownerId, args),
  returns: v.null(),
});
