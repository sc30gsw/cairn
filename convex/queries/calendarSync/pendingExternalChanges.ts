import { paginationOptsValidator, paginationResultValidator } from "convex/server";
import { v } from "convex/values";

import { internalQuery } from "../../_generated/server";

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
