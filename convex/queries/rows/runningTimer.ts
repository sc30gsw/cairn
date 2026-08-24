import { v } from "convex/values";

import { ownerQuery } from "../../lib/ownerFunctions";
import { runningTimerDtoValidator } from "../../lib/validators";
import { loadRunningTimer } from "../../services/rows/loadRunningTimer";

export const runningTimer = ownerQuery({
  args: {},
  handler: async (ctx) => loadRunningTimer(ctx, ctx.ownerId),
  returns: v.union(runningTimerDtoValidator, v.null()),
});
