import { v } from "convex/values";

import { ownerMutation } from "../../lib/ownerFunctions";
import { update as updateBlock } from "../../services/boardSchedule/blocks";

export const update = ownerMutation({
  args: {
    blockId: v.id("boardScheduleEvents"),
    color: v.optional(v.string()),
    endAt: v.string(),
    startAt: v.string(),
    title: v.string(),
  },
  handler: async (ctx, args) => updateBlock(ctx, ctx.ownerId, args),
  returns: v.null(),
});
