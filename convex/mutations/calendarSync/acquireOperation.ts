import { v } from "convex/values";

import { internalMutation } from "../../_generated/server";

export const acquireOperation = internalMutation({
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
