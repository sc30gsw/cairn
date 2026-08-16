import { v } from "convex/values";

import { ownerMutation } from "../../lib/ownerFunctions";
import { add as addRow } from "../../services/rows/add";

export const add = ownerMutation({
  args: {
    content: v.string(),
    dateJst: v.string(),
    itemId: v.id("items"),
    minutes: v.number(),
    todayJst: v.string(),
  },
  handler: async (ctx, args) => addRow(ctx, ctx.ownerId, args),
  returns: v.id("rows"),
});
