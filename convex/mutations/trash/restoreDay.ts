import { v } from "convex/values";

import { ownerMutation } from "../../lib/ownerFunctions";
import { restoreDay as restoreTrashDay } from "../../services/trash/restoreDay";

export const restoreDay = ownerMutation({
  args: { dayId: v.id("days") },
  handler: async (ctx, args) => restoreTrashDay(ctx, ctx.ownerId, args),
  returns: v.null(),
});
