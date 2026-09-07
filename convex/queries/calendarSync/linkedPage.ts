import { paginationOptsValidator, paginationResultValidator } from "convex/server";
import { v } from "convex/values";

import { internalQuery } from "../../_generated/server";
import schema from "../../schema";
import { getConnection } from "../../services/calendarSync/getConnection";

export const linkedPage = internalQuery({
  args: {
    ownerId: v.string(),
    connectionId: v.id("calendarConnections"),
    calendarId: v.optional(v.string()),
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(schema.doc("calendarSyncLinks")),
  handler: async (ctx, args) => {
    const [legacy, page] = await Promise.all([
      getConnection(ctx, args.ownerId),
      ctx.db
        .query("calendarSyncLinks")
        .withIndex("by_owner_and_calendar_and_event", (q) =>
          args.calendarId === undefined
            ? q.eq("ownerId", args.ownerId)
            : q.eq("ownerId", args.ownerId).eq("calendarId", args.calendarId),
        )
        .paginate(args.paginationOpts),
    ]);
    return {
      ...page,
      page: page.page.filter((link) => (link.connectionId ?? legacy?._id) === args.connectionId),
    };
  },
});
