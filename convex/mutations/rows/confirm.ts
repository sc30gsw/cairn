import { v } from "convex/values";

import { ownerMutation } from "../../lib/ownerFunctions";
import { confirm as confirmRow } from "../../services/rows/confirm";

export const confirm = ownerMutation({
  args: {
    content: v.string(),
    minutes: v.number(),
    rowId: v.id("rows"),
  },
  handler: async (ctx, args) => confirmRow(ctx, ctx.ownerId, args),
  returns: v.null(),
});
