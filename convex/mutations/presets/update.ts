import { v } from "convex/values";

import { ownerMutation } from "../../lib/ownerFunctions";
import { presetLineValidator, presetWeekdayInputValidator } from "../../lib/validators";
import { update as updatePreset } from "../../services/presets/update";

export const update = ownerMutation({
  args: {
    ...presetWeekdayInputValidator.fields,
    lines: v.array(presetLineValidator),
    name: v.string(),
    presetId: v.id("presets"),
  },
  handler: async (ctx, args) => updatePreset(ctx, ctx.ownerId, args),
  returns: v.null(),
});
