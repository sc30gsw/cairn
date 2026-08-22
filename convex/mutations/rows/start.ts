import { v } from "convex/values";

import { ownerMutation } from "../../lib/ownerFunctions";
import { start as startRow } from "../../services/rows/start";

export const start = ownerMutation({
  args: { rowId: v.id("rows") },
  handler: async (ctx, args) => startRow(ctx, ctx.ownerId, args),
  returns: v.null(),
});
