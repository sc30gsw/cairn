import { v } from "convex/values";

import { internalMutation } from "../../_generated/server";
import { CALENDAR_SYNC_DISCONNECT_INCOMPLETE_MESSAGE } from "../../lib/calendarSync";
import { getConnection } from "../../services/calendarSync/getConnection";

export const beginDisconnect = internalMutation({
  args: { ownerId: v.string() },
  handler: async (ctx, { ownerId }) => {
    const connection = await getConnection(ctx, ownerId);
    if (connection !== null) {
      await ctx.db.patch("calendarConnections", connection._id, {
        disconnecting: true,
        lastError: CALENDAR_SYNC_DISCONNECT_INCOMPLETE_MESSAGE,
        status: "error",
      });
    }
    return null;
  },
  returns: v.null(),
});
