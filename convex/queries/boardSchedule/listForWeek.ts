import { v } from "convex/values";

import { ownerQuery } from "../../lib/ownerFunctions";
import { boardScheduleEventDtoValidator, boardScheduleViewValidator } from "../../lib/validators";
import { listForWeek as listBlocksForWeek } from "../../services/boardSchedule/blocks";

export const listForWeek = ownerQuery({
  args: { anchorDateJst: v.string(), view: boardScheduleViewValidator },
  handler: async (ctx, args) => listBlocksForWeek(ctx, ctx.ownerId, args),
  returns: v.array(boardScheduleEventDtoValidator),
});
