import { v } from "convex/values";

import { ownerQuery } from "../../lib/ownerFunctions";
import { planTemplateDtoValidator } from "../../lib/validators";
import { list as listTemplates } from "../../services/plan/templates";

export const list = ownerQuery({
  args: {},
  handler: async (ctx) => listTemplates(ctx, ctx.ownerId),
  returns: v.array(planTemplateDtoValidator),
});
