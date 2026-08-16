import { v } from "convex/values";

import { ownerMutation } from "../../lib/ownerFunctions";
import { remove as removePreset } from "../../services/presets/remove";

export const remove = ownerMutation({
  args: { presetId: v.id("presets") },
  handler: async (ctx, args) => removePreset(ctx, ctx.ownerId, args),
  returns: v.null(),
});
