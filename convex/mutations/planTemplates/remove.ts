import { v } from "convex/values";

import { ownerMutation } from "../../lib/ownerFunctions";
import { remove as removeTemplate } from "../../services/plan/templates";

export const remove = ownerMutation({
  args: { templateId: v.id("planTemplates") },
  handler: async (ctx, args) => removeTemplate(ctx, ctx.ownerId, args),
  returns: v.null(),
});
