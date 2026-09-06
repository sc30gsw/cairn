import { v } from "convex/values";

import { internalMutation } from "../../_generated/server";
import { CALENDAR_SYNC_DISCONNECT_INCOMPLETE_MESSAGE } from "../../lib/calendarSync";
import { getConnection } from "../../services/calendarSync/getConnection";

export const acquire = internalMutation({
  args: { ownerId: v.string() },
  handler: async (ctx, { ownerId }) => {
    const current = await ctx.db
      .query("calendarSyncOperations")
      .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
      .unique();
    if (current !== null) {
      if (current.expiresAt > Date.now()) return null;
      await ctx.db.delete("calendarSyncOperations", current._id);
    }
    return ctx.db.insert("calendarSyncOperations", {
      ownerId,
      expiresAt: Date.now() + 11 * 60 * 1000,
    });
  },
  returns: v.union(v.id("calendarSyncOperations"), v.null()),
});

export const release = internalMutation({
  args: { operationId: v.id("calendarSyncOperations") },
  handler: async (ctx, { operationId }) => {
    if ((await ctx.db.get("calendarSyncOperations", operationId)) !== null) {
      await ctx.db.delete("calendarSyncOperations", operationId);
    }
    return null;
  },
  returns: v.null(),
});

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
