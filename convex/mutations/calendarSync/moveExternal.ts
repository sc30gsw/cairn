import { v } from "convex/values";

import { internal } from "../../_generated/api";
import { ownerMutation } from "../../lib/ownerFunctions";
import { moveExternal as moveExternalEvent } from "../../services/calendarSync/externalEvents";

export const moveExternal = ownerMutation({
  args: { endAt: v.string(), externalId: v.id("externalCalendarEvents"), startAt: v.string() },
  handler: async (ctx, args) => {
    const moved = await moveExternalEvent(ctx, ctx.ownerId, args);
    await ctx.scheduler.runAfter(0, internal.actions.calendarSync.pushExternal.pushExternal, {
      attempt: 0,
      calendarId: moved.calendarId,
      change: { allDay: moved.allDay, endAt: moved.endAt, kind: "move", startAt: moved.startAt },
      googleEventId: moved.googleEventId,
      ownerId: ctx.ownerId,
    });
    return null;
  },
  returns: v.null(),
});
