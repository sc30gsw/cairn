import { v } from "convex/values";

import { ownerMutation } from "../../lib/ownerFunctions";
import { applyOrder as applyRowOrder } from "../../services/rows/applyOrder";

export const applyOrder = ownerMutation({
  args: {
    dateJst: v.string(),
    orderedRowIds: v.array(v.id("rows")),
  },
  handler: async (ctx, args) => applyRowOrder(ctx, ctx.ownerId, args),
  returns: v.null(),
});
