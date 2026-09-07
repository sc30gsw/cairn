import { v } from "convex/values";

import { internalMutation } from "../../_generated/server";
import { clearConnection as clear } from "../../services/calendarSync/connection";

export const clearConnection = internalMutation({
  args: { connectionId: v.optional(v.id("calendarConnections")), ownerId: v.string() },
  handler: async (ctx, args) => clear(ctx, args.ownerId, args.connectionId),
  returns: v.boolean(),
});
