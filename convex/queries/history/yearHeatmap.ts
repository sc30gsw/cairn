import { v } from "convex/values";

import { ownerQuery } from "../../lib/ownerFunctions";
import { yearHeatmapValidator } from "../../lib/validators";
import { yearHeatmap as getYearHeatmap } from "../../services/history/yearHeatmap";

export const yearHeatmap = ownerQuery({
  args: { todayJst: v.string() },
  handler: async (ctx, args) => getYearHeatmap(ctx, ctx.ownerId, args),
  returns: yearHeatmapValidator,
});
