import { v } from "convex/values";

import { internalQuery } from "../../_generated/server";
import { getConnection } from "../../services/calendarSync/getConnection";

export const connectionAccess = internalQuery({
  args: { ownerId: v.string() },
  handler: async (ctx, args) => {
    const connection = await getConnection(ctx, args.ownerId);
    return connection === null || connection.disconnecting === true
      ? null
      : { googleAccountId: connection.googleAccountId };
  },
  returns: v.union(v.null(), v.object({ googleAccountId: v.string() })),
});
