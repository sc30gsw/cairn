import { v } from "convex/values";

import { internal } from "../../_generated/api";
import { ownerMutation } from "../../lib/ownerFunctions";
import { removeExternal as removeExternalEvent } from "../../services/calendarSync/externalEvents";

export const removeExternal = ownerMutation({
  args: { externalId: v.id("externalCalendarEvents") },
  handler: async (ctx, args) => {
    const removed = await removeExternalEvent(ctx, ctx.ownerId, args);
    await ctx.scheduler.runAfter(0, internal.actions.calendarSync.pushExternal.pushExternal, {
      attempt: 0,
      calendarId: removed.calendarId,
      change: { kind: "delete" },
      googleEventId: removed.googleEventId,
      ownerId: ctx.ownerId,
    });
    return null;
  },
  returns: v.null(),
});
