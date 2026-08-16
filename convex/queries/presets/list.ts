import { v } from "convex/values";

import { ownerQuery } from "../../lib/ownerFunctions";
import { presetDtoValidator } from "../../lib/validators";
import { list as listPresets } from "../../services/presets/list";

export const list = ownerQuery({
  args: {},
  handler: async (ctx) => listPresets(ctx, ctx.ownerId),
  returns: v.array(presetDtoValidator),
});
