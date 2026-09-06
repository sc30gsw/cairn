import { v } from "convex/values";

import { internalQuery } from "../../_generated/server";
import schema from "../../schema";

export const pendingExternalChange = internalQuery({
  args: { pendingId: v.id("calendarExternalChanges") },
  handler: async (ctx, args) => await ctx.db.get("calendarExternalChanges", args.pendingId),
  returns: v.union(v.null(), schema.doc("calendarExternalChanges")),
});

export const pendingExternalChanges = internalQuery({
  args: { ownerId: v.string() },
  handler: async (ctx, { ownerId }) => {
    const pending = await ctx.db
      .query("calendarExternalChanges")
      .withIndex("by_owner_and_calendar_and_event", (q) => q.eq("ownerId", ownerId))
      .take(100);
    return pending.map((change) => change._id);
  },
  returns: v.array(v.id("calendarExternalChanges")),
});
