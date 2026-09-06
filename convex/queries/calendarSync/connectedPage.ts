import { paginationOptsValidator, paginationResultValidator } from "convex/server";
import { v } from "convex/values";

import { internalQuery } from "../../_generated/server";

export const connectedPage = internalQuery({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const page = await ctx.db.query("calendarConnections").paginate(args.paginationOpts);
    return {
      ...page,
      page: page.page.map((connection) => ({
        ownerId: connection.ownerId,
        connectionId: connection._id,
      })),
    };
  },
  returns: paginationResultValidator(
    v.object({ ownerId: v.string(), connectionId: v.id("calendarConnections") }),
  ),
});
