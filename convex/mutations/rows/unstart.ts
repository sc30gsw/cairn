import { v } from "convex/values";

import { ownerMutation } from "../../lib/ownerFunctions";
import { unstart as pauseRow } from "../../services/rows/unstart";

export const unstart = ownerMutation({
  args: { rowId: v.id("rows") },
  handler: async (ctx, args) => pauseRow(ctx, ctx.ownerId, args),
  returns: v.null(),
});
