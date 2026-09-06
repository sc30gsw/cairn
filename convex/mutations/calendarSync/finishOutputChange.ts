import { v } from "convex/values";

import { internalMutation } from "../../_generated/server";
import { finishOutputChange as perform } from "../../services/calendarSync/outputMigration";

export const finishOutputChange = internalMutation({
  args: { ownerId: v.string(), generation: v.number() },
  returns: v.boolean(),
  handler: async (ctx, args) => perform(ctx, args),
});
