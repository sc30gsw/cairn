import { v } from "convex/values";

import { ownerMutation } from "../../lib/ownerFunctions";
import { copyYesterdayConfirmed as copyYesterdayConfirmedRows } from "../../services/rows/copyYesterdayConfirmed";

export const copyYesterdayConfirmed = ownerMutation({
  args: { dateJst: v.string(), todayJst: v.string() },
  handler: async (ctx, args) => copyYesterdayConfirmedRows(ctx, ctx.ownerId, args),
  returns: v.number(),
});
