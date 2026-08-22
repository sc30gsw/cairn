import { v } from "convex/values";

import { ownerMutation } from "../../lib/ownerFunctions";
import { pause as pauseRow } from "../../services/rows/pause";

export const pause = ownerMutation({
  args: { rowId: v.id("rows") },
  handler: async (ctx, args) => pauseRow(ctx, ctx.ownerId, args),
  returns: v.null(),
});
