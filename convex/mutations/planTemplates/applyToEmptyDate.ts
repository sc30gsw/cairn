import { v } from "convex/values";

import { ownerMutation } from "../../lib/ownerFunctions";
import { presetApplyResultValidator } from "../../lib/validators";
import { applyToEmptyDate as applyTemplate } from "../../services/plan/templates";

export const applyToEmptyDate = ownerMutation({
  args: {
    dateJst: v.string(),
    templateId: v.optional(v.id("planTemplates")),
  },
  handler: async (ctx, args) => applyTemplate(ctx, ctx.ownerId, args),
  returns: presetApplyResultValidator,
});
