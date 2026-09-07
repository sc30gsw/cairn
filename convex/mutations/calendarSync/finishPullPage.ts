import { v } from "convex/values";

import { internalMutation } from "../../_generated/server";
import { finishPullPage as finish } from "../../services/calendarSync/finishCalendarPull";

export const finishPullPage = internalMutation({
  args: {
    ownerId: v.string(),
    connectionId: v.id("calendarConnections"),
    calendarId: v.string(),
    pullId: v.string(),
    full: v.boolean(),
    todayJst: v.string(),
    syncToken: v.union(v.string(), v.null()),
    cursor: v.union(v.string(), v.null()),
  },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => finish(ctx, args),
});
