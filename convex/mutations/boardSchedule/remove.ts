import { v } from "convex/values";

import { ownerMutation } from "../../lib/ownerFunctions";
import { remove as removeBlock } from "../../services/boardSchedule/blocks";

export const remove = ownerMutation({
  args: { blockId: v.id("boardScheduleEvents") },
  handler: async (ctx, args) => removeBlock(ctx, ctx.ownerId, args),
  returns: v.null(),
});
