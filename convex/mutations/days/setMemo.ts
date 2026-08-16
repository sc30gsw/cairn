import { v } from "convex/values";

import { ownerMutation } from "../../lib/ownerFunctions";
import { setMemo as setDayMemo } from "../../services/days/setMemo";

export const setMemo = ownerMutation({
  args: { dateJst: v.string(), memo: v.string(), todayJst: v.string() },
  handler: async (ctx, args) => setDayMemo(ctx, ctx.ownerId, args),
  returns: v.null(),
});
