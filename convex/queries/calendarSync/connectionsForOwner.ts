import { paginationOptsValidator, paginationResultValidator } from "convex/server";
import { v } from "convex/values";

import { internalQuery } from "../../_generated/server";

export const connectionsForOwner = internalQuery({
  args: { ownerId: v.string(), paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const page = await ctx.db
      .query("calendarConnections")
      .withIndex("by_owner_and_googleAccountId", (q) => q.eq("ownerId", args.ownerId))
      .paginate(args.paginationOpts);
    return { ...page, page: page.page.map((connection) => connection._id) };
  },
  returns: paginationResultValidator(v.id("calendarConnections")),
});
