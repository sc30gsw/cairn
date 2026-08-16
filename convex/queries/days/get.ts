import { v } from "convex/values";

import { ownerQuery } from "../../lib/ownerFunctions";
import { dayPageValidator } from "../../lib/validators";
import { getDayPage } from "../../services/days/getDayPage";

export const get = ownerQuery({
  args: { dateJst: v.string(), todayJst: v.string() },
  handler: async (ctx, args) => getDayPage(ctx, ctx.ownerId, args),
  returns: dayPageValidator,
});
