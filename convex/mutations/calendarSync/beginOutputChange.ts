import { v } from "convex/values";

import { internalMutation } from "../../_generated/server";
import { beginOutputChange as perform } from "../../services/calendarSync/outputMigration";

export const beginOutputChange = internalMutation({
  args: { ownerId: v.string(), connectionId: v.id("calendarConnections"), calendarId: v.string() },
  returns: v.number(),
  handler: async (ctx, args) => perform(ctx, args),
});
