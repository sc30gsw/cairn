"use node";

import { v } from "convex/values";

import { ownerAction } from "../../lib/ownerFunctions";
import { continueOutputChange } from "../../services/calendarSync/changeOutput";
import { requireCalendarOperation } from "../../services/calendarSync/operation";

export const retryOutputChange = ownerAction({
  args: {},
  returns: v.union(v.literal("ok"), v.literal("moving")),
  handler: async (ctx) =>
    requireCalendarOperation(ctx, ctx.ownerId, () => continueOutputChange(ctx, ctx.ownerId)),
});
