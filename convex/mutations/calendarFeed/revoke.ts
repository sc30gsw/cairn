import { v } from "convex/values";

import { ownerMutation } from "../../lib/ownerFunctions";
import { revoke as revokeFeedToken } from "../../services/calendarFeed/revoke";

export const revoke = ownerMutation({
  args: {},
  handler: async (ctx) => revokeFeedToken(ctx, ctx.ownerId),
  returns: v.null(),
});
