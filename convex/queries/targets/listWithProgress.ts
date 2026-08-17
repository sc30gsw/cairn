import { v } from "convex/values";

import { ownerQuery } from "../../lib/ownerFunctions";
import { targetProgressDtoValidator } from "../../lib/validators";
import { listWithProgress as listTargetsWithProgress } from "../../services/targets/listWithProgress";

export const listWithProgress = ownerQuery({
  args: { weekStartJst: v.string() },
  handler: async (ctx, args) => listTargetsWithProgress(ctx, ctx.ownerId, args),
  returns: v.array(targetProgressDtoValidator),
});
