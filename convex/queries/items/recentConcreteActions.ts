import { v } from "convex/values";

import { ownerQuery } from "../../lib/ownerFunctions";
import { recentConcreteActionsValidator } from "../../lib/validators";
import { recentConcreteActions as getRecentConcreteActions } from "../../services/items/recentConcreteActions";

export const recentConcreteActions = ownerQuery({
  args: { itemId: v.id("items") },
  handler: async (ctx, args) => getRecentConcreteActions(ctx, ctx.ownerId, args),
  returns: recentConcreteActionsValidator,
});
