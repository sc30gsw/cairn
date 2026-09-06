import { v } from "convex/values";

import { internal } from "../../_generated/api";
import { CALENDAR_SYNC_NOT_CONNECTED_MESSAGE } from "../../lib/calendarSync";
import { NotFoundError } from "../../lib/errors";
import { ownerMutation, throwDomain } from "../../lib/ownerFunctions";
import { setVisibleCalendars as setVisible } from "../../services/calendarSync/connection";

export const setVisibleCalendars = ownerMutation({
  args: { calendarIds: v.array(v.string()) },
  handler: async (ctx, args) => {
    const connected = await setVisible(ctx, ctx.ownerId, args.calendarIds);
    if (!connected) {
      throwDomain(
        new NotFoundError({ message: CALENDAR_SYNC_NOT_CONNECTED_MESSAGE, resource: "接続" }),
      );
    }
    await ctx.scheduler.runAfter(0, internal.actions.calendarSync.syncOwner.syncOwner, {
      ownerId: ctx.ownerId,
    });
    return null;
  },
  returns: v.null(),
});
