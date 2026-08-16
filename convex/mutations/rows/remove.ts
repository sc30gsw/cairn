import { v } from "convex/values";

import { ownerMutation } from "../../lib/ownerFunctions";
import { remove as removeRow } from "../../services/rows/remove";

export const remove = ownerMutation({
  args: { rowId: v.id("rows") },
  handler: async (ctx, args) => removeRow(ctx, ctx.ownerId, args),
  returns: v.null(),
});
