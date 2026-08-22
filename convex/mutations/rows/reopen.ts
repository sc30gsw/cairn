import { v } from "convex/values";

import { ownerMutation } from "../../lib/ownerFunctions";
import { reopen as reopenRow } from "../../services/rows/reopen";

export const reopen = ownerMutation({
  args: { rowId: v.id("rows") },
  handler: async (ctx, args) => reopenRow(ctx, ctx.ownerId, args),
  returns: v.null(),
});
