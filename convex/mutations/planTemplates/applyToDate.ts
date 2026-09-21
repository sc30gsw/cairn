import { v } from "convex/values";

import { ownerMutation } from "../../lib/ownerFunctions";
import { presetApplyResultValidator } from "../../lib/validators";
import { applyToDate as applyTemplate } from "../../services/plan/templates";

export const applyToDate = ownerMutation({
  args: {
    dateJst: v.string(),
    templateId: v.id("planTemplates"),
    todayJst: v.string(),
  },
  handler: async (ctx, args) => applyTemplate(ctx, ctx.ownerId, args),
  returns: presetApplyResultValidator,
});
