import { v } from "convex/values";

import { ownerMutation } from "../../lib/ownerFunctions";
import { conditionValidator } from "../../lib/validators";
import { setCondition as setDayCondition } from "../../services/days/setCondition";

export const setCondition = ownerMutation({
  args: {
    condition: conditionValidator,
    dateJst: v.string(),
    todayJst: v.string(),
  },
  handler: async (ctx, args) => setDayCondition(ctx, ctx.ownerId, args),
  returns: v.null(),
});
