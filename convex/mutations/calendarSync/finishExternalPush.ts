import { v } from "convex/values";

import { internalMutation } from "../../_generated/server";
import { markStatus, resetCalendarCursor } from "../../services/calendarSync/connection";

export const finishExternalPush = internalMutation({
  args: { pendingId: v.id("calendarExternalChanges"), lastError: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const pending = await ctx.db.get("calendarExternalChanges", args.pendingId);
    if (pending === null || pending.settledAt !== undefined) {
      return null;
    }
    await ctx.db.patch("calendarExternalChanges", pending._id, { settledAt: Date.now() });
    if (args.lastError !== undefined) {
      await resetCalendarCursor(
        ctx,
        pending.ownerId,
        pending.calendarId,
        { dropExternals: false },
        pending.connectionId,
      );
      await markStatus(ctx, {
        ownerId: pending.ownerId,
        connectionId: pending.connectionId,
        lastError: args.lastError,
        status: "error",
        syncedAt: null,
      });
    }
    return null;
  },
  returns: v.null(),
});
