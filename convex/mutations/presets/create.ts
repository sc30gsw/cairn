import { v } from "convex/values";

import { ownerMutation } from "../../lib/ownerFunctions";
import { presetLineValidator, presetWeekdayInputValidator } from "../../lib/validators";
import { create as createPreset } from "../../services/presets/create";

export const create = ownerMutation({
  args: {
    ...presetWeekdayInputValidator.fields,
    lines: v.array(presetLineValidator),
    name: v.string(),
  },
  handler: async (ctx, args) => createPreset(ctx, ctx.ownerId, args),
  returns: v.id("presets"),
});
