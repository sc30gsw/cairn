import { v } from "convex/values";

import { ownerMutation } from "../../lib/ownerFunctions";
import { unconfirm as unconfirmRow } from "../../services/rows/unconfirm";

export const unconfirm = ownerMutation({
  args: { rowId: v.id("rows") },
  handler: async (ctx, args) => unconfirmRow(ctx, ctx.ownerId, args),
  returns: v.null(),
});
