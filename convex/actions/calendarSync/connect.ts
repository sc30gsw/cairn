"use node";

import { v } from "convex/values";

import { ownerAction } from "../../lib/ownerFunctions";
import { ownerSyncOutcomeValidator } from "../../lib/validators";
import { completeAuthorization } from "../../services/calendarSync/completeAuthorization";

export const connect = ownerAction({
  args: { requestId: v.id("calendarAuthorizationRequests") },
  handler: async (ctx, args) => completeAuthorization(ctx, ctx.ownerId, args.requestId),
  returns: v.union(ownerSyncOutcomeValidator, v.literal("moving")),
});
