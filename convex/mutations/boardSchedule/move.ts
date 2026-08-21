import { v } from "convex/values";

import { ownerMutation } from "../../lib/ownerFunctions";
import { move as moveBlock } from "../../services/boardSchedule/blocks";

export const move = ownerMutation({
  args: {
    blockId: v.id("boardScheduleEvents"),
    endAt: v.string(),
    startAt: v.string(),
  },
  handler: async (ctx, args) => moveBlock(ctx, ctx.ownerId, args),
  returns: v.null(),
});
