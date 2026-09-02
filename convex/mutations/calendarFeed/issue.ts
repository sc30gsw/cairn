import { v } from "convex/values";

import { ownerMutation } from "../../lib/ownerFunctions";
import { issue as issueFeedToken } from "../../services/calendarFeed/issue";

export const issue = ownerMutation({
  args: {},
  handler: async (ctx) => issueFeedToken(ctx, ctx.ownerId),
  returns: v.string(),
});
