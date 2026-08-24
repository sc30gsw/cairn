import { v } from "convex/values";

import { ownerMutation } from "../../lib/ownerFunctions";
import { disconnectSlack as disconnectOwnerSlack } from "../../services/notifications/disconnectSlack";

export const disconnectSlack = ownerMutation({
  args: {},
  handler: async (ctx) => disconnectOwnerSlack(ctx, ctx.ownerId),
  returns: v.null(),
});
