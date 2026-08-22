import { v } from "convex/values";

import { boardScheduleColorValidator } from "../../lib/boardScheduleColors";
import { ownerMutation } from "../../lib/ownerFunctions";
import { create as createBlock } from "../../services/boardSchedule/blocks";

export const create = ownerMutation({
  args: {
    color: v.optional(boardScheduleColorValidator),
    endAt: v.string(),
    rowId: v.id("rows"),
    startAt: v.string(),
  },
  handler: async (ctx, args) => createBlock(ctx, ctx.ownerId, args),
  returns: v.id("boardScheduleEvents"),
});
