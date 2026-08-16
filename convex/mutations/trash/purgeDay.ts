import { v } from "convex/values";

import { ownerMutation } from "../../lib/ownerFunctions";
import { purgeDay as purgeTrashDay } from "../../services/trash/purgeDay";

export const purgeDay = ownerMutation({
  args: { dayId: v.id("days") },
  handler: async (ctx, args) => purgeTrashDay(ctx, ctx.ownerId, args),
  returns: v.null(),
});
