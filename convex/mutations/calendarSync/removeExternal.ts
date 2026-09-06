import { v } from "convex/values";

import { ownerMutation } from "../../lib/ownerFunctions";
import { removeExternal as removeExternalEvent } from "../../services/calendarSync/externalEvents";
import { queueExternalChange } from "../../services/calendarSync/queueExternalChange";

export const removeExternal = ownerMutation({
  args: { externalId: v.id("externalCalendarEvents") },
  handler: async (ctx, args) => {
    const removed = await removeExternalEvent(ctx, ctx.ownerId, args);
    await queueExternalChange(ctx, {
      calendarId: removed.calendarId,
      change: { kind: "delete" },
      googleEventId: removed.googleEventId,
      ownerId: ctx.ownerId,
    });
    return null;
  },
  returns: v.null(),
});
