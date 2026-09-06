import { Result } from "better-result";
import { v } from "convex/values";

import { ownerMutation, throwDomain } from "../../lib/ownerFunctions";
import { beginRequest } from "../../services/calendarAuth/requests";

export const begin = ownerMutation({
  args: {
    calendarId: v.optional(v.string()),
    googleAccountId: v.optional(v.string()),
    purpose: v.union(v.literal("read"), v.literal("write")),
  },
  handler: async (ctx, args) => {
    const result = await beginRequest(ctx, ctx.ownerId, args);
    if (Result.isError(result)) {
      throwDomain(result.error);
    }
    return result.value;
  },
  returns: v.object({
    requestId: v.id("calendarAuthorizationRequests"),
    scopes: v.array(v.string()),
  }),
});
