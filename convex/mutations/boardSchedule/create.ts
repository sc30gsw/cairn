import { v } from "convex/values";

import { ownerMutation } from "../../lib/ownerFunctions";
import { create as createBlock } from "../../services/boardSchedule/blocks";

export const create = ownerMutation({
  args: {
    color: v.optional(v.string()),
    endAt: v.string(),
    startAt: v.string(),
    title: v.string(),
  },
  handler: async (ctx, args) => createBlock(ctx, ctx.ownerId, args),
  returns: v.id("boardScheduleEvents"),
});
