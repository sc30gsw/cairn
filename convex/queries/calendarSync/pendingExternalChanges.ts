import { paginationOptsValidator, paginationResultValidator } from "convex/server";
import { v } from "convex/values";

import { internalQuery } from "../../_generated/server";
import { getConnection } from "../../services/calendarSync/getConnection";

export const pendingExternalChanges = internalQuery({
  args: {
    connectionId: v.optional(v.id("calendarConnections")),
    ownerId: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, { ownerId, paginationOpts, connectionId }) => {
    const [legacy, pending] = await Promise.all([
      getConnection(ctx, ownerId),
      ctx.db
        .query("calendarExternalChanges")
        .withIndex("by_owner_and_settledAt", (q) =>
          q.eq("ownerId", ownerId).eq("settledAt", undefined),
        )
        .paginate(paginationOpts),
    ]);
    return {
      ...pending,
      page: pending.page.flatMap((change) =>
        connectionId === undefined || (change.connectionId ?? legacy?._id) === connectionId
          ? [change._id]
          : [],
      ),
    };
  },
  returns: paginationResultValidator(v.id("calendarExternalChanges")),
});
