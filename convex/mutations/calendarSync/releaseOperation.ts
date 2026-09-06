import { v } from "convex/values";

import { internalMutation } from "../../_generated/server";

export const releaseOperation = internalMutation({
  args: { operationId: v.id("calendarSyncOperations") },
  handler: async (ctx, { operationId }) => {
    if ((await ctx.db.get("calendarSyncOperations", operationId)) !== null) {
      await ctx.db.delete("calendarSyncOperations", operationId);
    }
    return null;
  },
  returns: v.null(),
});
