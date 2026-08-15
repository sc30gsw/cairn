import { v } from "convex/values";

import { ownerMutation } from "./ownerFunctions";

export const setBed = ownerMutation({
  args: { bedHm: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("tonight")
      .withIndex("by_owner", (q) => q.eq("ownerId", ctx.ownerId))
      .unique();
    if (existing === null) {
      await ctx.db.insert("tonight", { bedHm: args.bedHm, ownerId: ctx.ownerId });
    } else {
      await ctx.db.patch(existing._id, { bedHm: args.bedHm });
    }
    return null;
  },
  returns: v.null(),
});
