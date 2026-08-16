import { v } from "convex/values";

import { ownerMutation } from "../../lib/ownerFunctions";
import { restore as restoreRow } from "../../services/rows/restore";

export const restore = ownerMutation({
  args: { rowId: v.id("rows") },
  handler: async (ctx, args) => restoreRow(ctx, ctx.ownerId, args),
  returns: v.null(),
});
