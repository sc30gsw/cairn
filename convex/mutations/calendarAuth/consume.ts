import { Result } from "better-result";
import { v } from "convex/values";

import { internalMutation } from "../../_generated/server";
import { throwDomain } from "../../lib/ownerFunctions";
import { consumeRequest } from "../../services/calendarAuth/requests";

export const consume = internalMutation({
  args: { ownerId: v.string(), requestId: v.id("calendarAuthorizationRequests") },
  handler: async (ctx, args) => {
    const result = await consumeRequest(ctx, args.ownerId, args.requestId);
    if (Result.isError(result)) {
      throwDomain(result.error);
    }
    return result.value;
  },
  returns: v.object({
    calendarId: v.optional(v.string()),
    googleAccountId: v.string(),
    purpose: v.union(v.literal("read"), v.literal("write")),
  }),
});
