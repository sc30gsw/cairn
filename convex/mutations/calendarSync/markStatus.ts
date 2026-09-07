import { v } from "convex/values";

import { internalMutation } from "../../_generated/server";
import { calendarSyncStatusValidator } from "../../lib/validators";
import { markStatus as markConnectionStatus } from "../../services/calendarSync/connection";

export const markStatus = internalMutation({
  args: {
    connectionId: v.optional(v.id("calendarConnections")),
    lastError: v.union(v.string(), v.null()),
    ownerId: v.string(),
    status: calendarSyncStatusValidator,
    syncedAt: v.union(v.number(), v.null()),
  },
  handler: async (ctx, args) => markConnectionStatus(ctx, args),
  returns: v.null(),
});
