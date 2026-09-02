import { v } from "convex/values";

import { internalQuery } from "../../_generated/server";
import { calendarFeedValidator } from "../../lib/validators";
import { feedByToken as loadFeedByToken } from "../../services/calendarFeed/feedByToken";

export const feedByToken = internalQuery({
  args: { token: v.string() },
  handler: async (ctx, args) => loadFeedByToken(ctx, args),
  returns: calendarFeedValidator,
});
