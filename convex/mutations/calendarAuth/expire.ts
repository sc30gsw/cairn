import { v } from "convex/values";

import { internalMutation } from "../../_generated/server";

export const expire = internalMutation({
  args: { requestId: v.id("calendarAuthorizationRequests") },
  handler: async (ctx, args) => {
    const request = await ctx.db.get("calendarAuthorizationRequests", args.requestId);
    if (request && request.expiresAt <= Date.now()) {
      await ctx.db.delete("calendarAuthorizationRequests", args.requestId);
    }
    return null;
  },
  returns: v.null(),
});
