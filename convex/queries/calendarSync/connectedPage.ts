import { paginationOptsValidator, paginationResultValidator } from "convex/server";
import { v } from "convex/values";

import { internalQuery } from "../../_generated/server";

export const connectedPage = internalQuery({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const page = await ctx.db.query("calendarConnections").paginate(args.paginationOpts);
    return {
      ...page,
      //? 権限切れ・解除中の接続は cron から触らない。再接続すれば connect が初回同期を行う
      page: page.page.flatMap((connection) =>
        connection.status === "needsReauth" || connection.disconnecting === true
          ? []
          : [{ ownerId: connection.ownerId, connectionId: connection._id }],
      ),
    };
  },
  returns: paginationResultValidator(
    v.object({ ownerId: v.string(), connectionId: v.id("calendarConnections") }),
  ),
});
