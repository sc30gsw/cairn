import { v } from "convex/values";

import { ownerMutation } from "../../lib/ownerFunctions";
import { unskip as unskipRow } from "../../services/rows/unskip";

export const unskip = ownerMutation({
  args: { rowId: v.id("rows") },
  handler: async (ctx, args) => unskipRow(ctx, ctx.ownerId, args),
  returns: v.null(),
});
