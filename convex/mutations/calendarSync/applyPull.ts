import { v } from "convex/values";

import { internalMutation } from "../../_generated/server";
import { pulledEventValidator } from "../../lib/validators";
import { applyPull as applyPulledEvents } from "../../services/calendarSync/applyPull";

export const applyPull = internalMutation({
  args: {
    calendarId: v.string(),
    events: v.array(pulledEventValidator),
    ownerId: v.string(),
    todayJst: v.string(),
  },
  handler: async (ctx, args) => applyPulledEvents(ctx, args),
  returns: v.null(),
});
