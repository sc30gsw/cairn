import { v } from "convex/values";

import { internalMutation } from "../../_generated/server";
import { finishCalendarPull as finishPull } from "../../services/calendarSync/finishCalendarPull";

export const finishCalendarPull = internalMutation({
  args: {
    calendarId: v.string(),
    keepEventIds: v.union(v.array(v.string()), v.null()),
    ownerId: v.string(),
    syncToken: v.union(v.string(), v.null()),
    todayJst: v.string(),
  },
  handler: async (ctx, args) => finishPull(ctx, args),
  returns: v.null(),
});
