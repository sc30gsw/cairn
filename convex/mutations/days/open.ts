import { v } from "convex/values";

import { ownerMutation } from "../../lib/ownerFunctions";
import { presetApplyResultValidator } from "../../lib/validators";
import { ensureCatalog } from "../../services/catalog/ensureCatalog";
import { openDay } from "../../services/days/openDay";

export const open = ownerMutation({
  args: { dateJst: v.string(), todayJst: v.string() },
  handler: async (ctx, args) => {
    await ensureCatalog(ctx, ctx.ownerId);
    return openDay(ctx, ctx.ownerId, args);
  },
  returns: presetApplyResultValidator,
});
