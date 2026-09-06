import { v } from "convex/values";

import { internalMutation } from "../../_generated/server";
import { googleCalendarSummaryValidator } from "../../lib/validators";
import { upsertConnection as upsert } from "../../services/calendarSync/connection";

export const upsertConnection = internalMutation({
  args: {
    calendars: v.array(googleCalendarSummaryValidator),
    defaultVisibleCalendarIds: v.array(v.string()),
    googleAccountId: v.string(),
    googleEmail: v.union(v.string(), v.null()),
    ownerId: v.string(),
  },
  handler: async (ctx, args) => upsert(ctx, args),
  returns: v.null(),
});
