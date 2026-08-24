import { v } from "convex/values";

import { ownerMutation } from "../../lib/ownerFunctions";
import { resumeTimer as resumeRowTimer } from "../../services/rows/resumeTimer";

export const resumeTimer = ownerMutation({
  args: { rowId: v.id("rows") },
  handler: async (ctx, args) => resumeRowTimer(ctx, ctx.ownerId, args),
  returns: v.null(),
});
