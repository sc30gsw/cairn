import { v } from "convex/values";

import { ownerMutation } from "../../lib/ownerFunctions";
import { googleEventColorIdValidator } from "../../lib/validators/calendarSync";
import { moveExternal as moveExternalEvent } from "../../services/calendarSync/externalEvents";
import { queueExternalChange } from "../../services/calendarSync/queueExternalChange";

export const moveExternal = ownerMutation({
  args: {
    title: v.optional(v.string()),
    colorId: v.optional(googleEventColorIdValidator),
    endAt: v.string(),
    externalId: v.id("externalCalendarEvents"),
    startAt: v.string(),
  },
  handler: async (ctx, args) => {
    const moved = await moveExternalEvent(ctx, ctx.ownerId, args);
    await queueExternalChange(ctx, {
      calendarId: moved.calendarId,
      change: {
        title: moved.title,
        colorId: moved.colorId,
        allDay: moved.allDay,
        endAt: moved.endAt,
        kind: "move",
        startAt: moved.startAt,
      },
      googleEventId: moved.googleEventId,
      ownerId: ctx.ownerId,
    });
    return null;
  },
  returns: v.null(),
});
