import { v } from "convex/values";

import { ownerMutation } from "../../lib/ownerFunctions";
import { presetSettingsDtoValidator } from "../../lib/validators";
import { saveSettings as savePresetSettings } from "../../services/presets/saveSettings";

export const saveSettings = ownerMutation({
  args: presetSettingsDtoValidator.fields,
  handler: async (ctx, args) => savePresetSettings(ctx, ctx.ownerId, args),
  returns: v.null(),
});
