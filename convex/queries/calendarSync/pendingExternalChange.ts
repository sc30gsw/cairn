import { v } from "convex/values";

import { internalQuery } from "../../_generated/server";
import schema from "../../schema";
import { canEditExternal } from "../../services/calendarSync/externalEvents";

export const pendingExternalChange = internalQuery({
  args: { pendingId: v.id("calendarExternalChanges") },
  handler: async (ctx, args) => {
    const change = await ctx.db.get("calendarExternalChanges", args.pendingId);
    if (change === null || change.settledAt !== undefined) return null;
    return (await canEditExternal(
      ctx,
      change.ownerId,
      change.calendarId,
      change.googleEventId,
      change.connectionId,
    ))
      ? change
      : null;
  },
  returns: v.union(v.null(), schema.doc("calendarExternalChanges")),
});
