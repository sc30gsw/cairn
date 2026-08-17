import { v } from "convex/values";

import { ownerMutation } from "../../lib/ownerFunctions";
import { targetMetricValidator } from "../../lib/validators";
import { save as saveTarget } from "../../services/targets/save";

export const save = ownerMutation({
  args: {
    categoryId: v.id("categories"),
    metric: targetMetricValidator,
    targetValue: v.number(),
  },
  handler: async (ctx, args) => saveTarget(ctx, ctx.ownerId, args),
  returns: v.id("targets"),
});
