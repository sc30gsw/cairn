import { v } from "convex/values";

import { internalQuery } from "../../_generated/server";
import schema from "../../schema";

export const pendingExternalChange = internalQuery({
  args: { pendingId: v.id("calendarExternalChanges") },
  handler: async (ctx, args) => {
    const change = await ctx.db.get("calendarExternalChanges", args.pendingId);
    return change?.settledAt === undefined ? change : null;
  },
  returns: v.union(v.null(), schema.doc("calendarExternalChanges")),
});
