import { v } from "convex/values";

import { ownerMutation } from "../../lib/ownerFunctions";
import { skip as skipRow } from "../../services/rows/skip";

export const skip = ownerMutation({
  args: { rowId: v.id("rows") },
  handler: async (ctx, args) => skipRow(ctx, ctx.ownerId, args),
  returns: v.null(),
});
