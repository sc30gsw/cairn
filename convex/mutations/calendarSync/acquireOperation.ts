import { v } from "convex/values";

import { internalMutation } from "../../_generated/server";

export const acquireOperation = internalMutation({
  args: { ownerId: v.string(), connectionId: v.optional(v.id("calendarConnections")) },
  handler: async (ctx, { ownerId, connectionId }) => {
    const now = Date.now();
    const blocking = await ctx.db
      .query("calendarSyncOperations")
      .withIndex("by_owner_and_connectionId", (q) => q.eq("ownerId", ownerId))
      .filter((q) =>
        q.and(
          q.gt(q.field("expiresAt"), now),
          connectionId === undefined
            ? true
            : q.or(
                q.eq(q.field("connectionId"), connectionId),
                q.eq(q.field("connectionId"), undefined),
              ),
        ),
      )
      .first();
    if (blocking !== null) return null;
    const expired = await ctx.db
      .query("calendarSyncOperations")
      .withIndex("by_owner_and_connectionId", (q) =>
        q.eq("ownerId", ownerId).eq("connectionId", connectionId),
      )
      .take(100);
    await Promise.all(
      expired.map((operation) => ctx.db.delete("calendarSyncOperations", operation._id)),
    );
    return ctx.db.insert("calendarSyncOperations", {
      ownerId,
      connectionId,
      expiresAt: Date.now() + 11 * 60 * 1000,
    });
  },
  returns: v.union(v.id("calendarSyncOperations"), v.null()),
});
