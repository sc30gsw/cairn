import { v } from "convex/values";

import { internalMutation } from "../../_generated/server";
import { pulledEventValidator } from "../../lib/validators";
import { applyPull as applyPulledEvents } from "../../services/calendarSync/applyPull";

export const applyPull = internalMutation({
  args: {
    generation: v.optional(v.number()),
    pullId: v.optional(v.string()),
    connectionId: v.optional(v.id("calendarConnections")),
    calendarId: v.string(),
    events: v.array(pulledEventValidator),
    finish: v.union(
      v.null(),
      v.object({
        keepEventIds: v.union(v.array(v.string()), v.null()),
        syncToken: v.union(v.string(), v.null()),
      }),
    ),
    ownerId: v.string(),
    todayJst: v.string(),
  },
  handler: async (ctx, args) => applyPulledEvents(ctx, args),
  returns: v.null(),
});
