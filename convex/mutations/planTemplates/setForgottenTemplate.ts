import { v } from "convex/values";

import { ownerMutation } from "../../lib/ownerFunctions";
import { setForgottenTemplate as setForgotten } from "../../services/plan/templates";

export const setForgottenTemplate = ownerMutation({
  args: { templateId: v.union(v.id("planTemplates"), v.null()) },
  handler: async (ctx, args) => setForgotten(ctx, ctx.ownerId, args),
  returns: v.null(),
});
