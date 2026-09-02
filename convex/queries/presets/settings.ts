import { ownerQuery } from "../../lib/ownerFunctions";
import { presetSettingsDtoValidator } from "../../lib/validators";
import { getSettings } from "../../services/presets/getSettings";

export const settings = ownerQuery({
  args: {},
  handler: async (ctx) => getSettings(ctx, ctx.ownerId),
  returns: presetSettingsDtoValidator,
});
