import { v } from "convex/values";

import { ownerMutation } from "../../lib/ownerFunctions";
import { removeDay as removeTrashDay } from "../../services/trash/removeDay";

export const removeDay = ownerMutation({
  args: { dateJst: v.string() },
  handler: async (ctx, args) => removeTrashDay(ctx, ctx.ownerId, args),
  returns: v.null(),
});
