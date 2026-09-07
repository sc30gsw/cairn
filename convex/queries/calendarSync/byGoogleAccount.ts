import { v } from "convex/values";

import { internalQuery } from "../../_generated/server";

export const byGoogleAccount = internalQuery({
  args: { ownerId: v.string(), googleAccountId: v.string() },
  handler: async (ctx, args) => {
    const connection = await ctx.db
      .query("calendarConnections")
      .withIndex("by_owner_and_googleAccountId", (q) =>
        q.eq("ownerId", args.ownerId).eq("googleAccountId", args.googleAccountId),
      )
      .unique();
    return connection === null || connection.disconnecting === true ? null : connection._id;
  },
  returns: v.union(v.null(), v.id("calendarConnections")),
});
