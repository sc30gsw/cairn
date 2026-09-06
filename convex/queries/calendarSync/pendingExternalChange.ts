import { paginationOptsValidator, paginationResultValidator } from "convex/server";
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

export const pendingExternalChanges = internalQuery({
  args: { ownerId: v.string(), paginationOpts: paginationOptsValidator },
  handler: async (ctx, { ownerId, paginationOpts }) => {
    const pending = await ctx.db
      .query("calendarExternalChanges")
      .withIndex("by_owner_and_settledAt", (q) =>
        q.eq("ownerId", ownerId).eq("settledAt", undefined),
      )
      .paginate(paginationOpts);
    return { ...pending, page: pending.page.map((change) => change._id) };
  },
  returns: paginationResultValidator(v.id("calendarExternalChanges")),
});
