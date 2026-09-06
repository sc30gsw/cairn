import { v } from "convex/values";

import { internalQuery } from "../../_generated/server";

//? cron の突き合わせ対象。権限切れ（needsReauth）は再接続されるまで触らない
export const listConnectedOwners = internalQuery({
  args: {},
  handler: async (ctx) => {
    const connections = await ctx.db.query("calendarConnections").take(1000);
    const ownerIds: string[] = [];
    for (const connection of connections) {
      if (connection.status !== "needsReauth") {
        ownerIds.push(connection.ownerId);
      }
    }
    return ownerIds;
  },
  returns: v.array(v.string()),
});
