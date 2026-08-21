import { v } from "convex/values";

import { ownerQuery } from "../../lib/ownerFunctions";
import { boardScheduleEventDtoValidator } from "../../lib/validators";
import { listForWeek as listBlocksForWeek } from "../../services/boardSchedule/blocks";

export const listForWeek = ownerQuery({
  args: { anchorDateJst: v.string() },
  handler: async (ctx, args) => listBlocksForWeek(ctx, ctx.ownerId, args),
  returns: v.array(boardScheduleEventDtoValidator),
});
