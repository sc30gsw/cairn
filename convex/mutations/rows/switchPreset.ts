import { v } from "convex/values";

import { ownerMutation } from "../../lib/ownerFunctions";
import { switchPreset as switchRowPreset } from "../../services/rows/switchPreset";

export const switchPreset = ownerMutation({
  args: { dateJst: v.string(), presetId: v.id("presets"), todayJst: v.string() },
  handler: async (ctx, args) => switchRowPreset(ctx, ctx.ownerId, args),
  returns: v.null(),
});
