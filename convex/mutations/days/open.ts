import { v } from "convex/values";

import { ownerMutation } from "../../lib/ownerFunctions";
import { presetApplyResultValidator } from "../../lib/validators";
import { openDay } from "../../services/days/openDay";

export const open = ownerMutation({
  args: { dateJst: v.string(), todayJst: v.string() },
  handler: async (ctx, args) => openDay(ctx, ctx.ownerId, args),
  returns: presetApplyResultValidator,
});
