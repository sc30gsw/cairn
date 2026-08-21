import { v } from "convex/values";

import { ownerMutation } from "../../lib/ownerFunctions";
import { presetLineValidator, weekdayValidator } from "../../lib/validators";
import { create as createPreset } from "../../services/presets/create";

export const create = ownerMutation({
  args: {
    lines: v.array(presetLineValidator),
    name: v.string(),
    weekday: weekdayValidator,
  },
  handler: async (ctx, args) => createPreset(ctx, ctx.ownerId, args),
  returns: v.id("presets"),
});
