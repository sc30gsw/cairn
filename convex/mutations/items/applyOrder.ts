import { v } from "convex/values";

import { ownerMutation } from "../../lib/ownerFunctions";
import { categoryItemOrderValidator } from "../../lib/validators";
import { applyOrder as applyItemOrder } from "../../services/items/applyOrder";

export const applyOrder = ownerMutation({
  args: {
    updates: v.array(categoryItemOrderValidator),
  },
  handler: async (ctx, args) => applyItemOrder(ctx, ctx.ownerId, args),
  returns: v.null(),
});
