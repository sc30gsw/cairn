import { v } from "convex/values";

import { internalMutation } from "../../_generated/server";
import schema from "../../schema";
import { recordOutputMove as perform } from "../../services/calendarSync/outputMigration";

export const recordOutputMove = internalMutation({
  args: {
    ownerId: v.string(),
    generation: v.number(),
    linkId: v.id("calendarSyncLinks"),
    pendingMove: schema.tables.calendarSyncLinks.validator.fields.pendingMove,
  },
  returns: v.boolean(),
  handler: async (ctx, args) => perform(ctx, args),
});
