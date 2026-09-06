import { v } from "convex/values";

import { internalMutation } from "../../_generated/server";
import { CALENDAR_SYNC_DISCONNECT_INCOMPLETE_MESSAGE } from "../../lib/calendarSync";
import { ConflictError } from "../../lib/errors";
import { throwDomain } from "../../lib/ownerFunctions";
import { getConnection, getOutputSettings } from "../../services/calendarSync/getConnection";

export const beginDisconnect = internalMutation({
  args: { connectionId: v.optional(v.id("calendarConnections")), ownerId: v.string() },
  handler: async (ctx, { ownerId, connectionId }) => {
    const connection = await getConnection(ctx, ownerId, connectionId);
    if (connection !== null) {
      const settings = await getOutputSettings(ctx, ownerId);
      if (
        settings?.changing &&
        (settings.connectionId === connection._id || settings.nextConnectionId === connection._id)
      )
        throwDomain(
          new ConflictError({ message: "書き込み先の変更を完了してから解除してください" }),
        );
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
