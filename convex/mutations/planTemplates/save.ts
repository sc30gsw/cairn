import { v } from "convex/values";

import { ownerMutation } from "../../lib/ownerFunctions";
import { planTemplateEventDraftValidator } from "../../lib/validators";
import { save as saveTemplate } from "../../services/plan/templates";

export const save = ownerMutation({
  args: {
    events: v.array(planTemplateEventDraftValidator),
    name: v.string(),
    templateId: v.optional(v.id("planTemplates")),
  },
  handler: async (ctx, args) => saveTemplate(ctx, ctx.ownerId, args),
  returns: v.id("planTemplates"),
});
