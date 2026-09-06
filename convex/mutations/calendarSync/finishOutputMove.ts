import { v } from "convex/values";

import { internalMutation } from "../../_generated/server";
import { finishOutputMove as perform } from "../../services/calendarSync/outputMigration";

export const finishOutputMove = internalMutation({
  args: { ownerId: v.string(), generation: v.number(), linkId: v.id("calendarSyncLinks") },
  returns: v.boolean(),
  handler: async (ctx, args) => perform(ctx, args),
});
