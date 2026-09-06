import { v } from "convex/values";

import { internalMutation } from "../../_generated/server";
import { markStatus, resetCalendarCursor } from "../../services/calendarSync/connection";

export const abandonExternalPush = internalMutation({
  args: { calendarId: v.string(), lastError: v.string(), ownerId: v.string() },
  handler: async (ctx, args) => {
    await resetCalendarCursor(ctx, args.ownerId, args.calendarId, { dropExternals: false });
    await markStatus(ctx, {
      lastError: args.lastError,
      ownerId: args.ownerId,
      status: "error",
      syncedAt: null,
    });
    return null;
  },
  returns: v.null(),
});
