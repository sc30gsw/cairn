import { v } from "convex/values";

import { internalQuery } from "../../_generated/server";

export const canSignIn = internalQuery({
  args: { googleAccountId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.db
      .query("googleCalendarIdentities")
      .withIndex("by_googleAccountId", (q) => q.eq("googleAccountId", args.googleAccountId))
      .unique();
    return identity?.signInAllowed ?? true;
  },
  returns: v.boolean(),
});
