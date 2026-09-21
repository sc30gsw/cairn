import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";

import { ownerQuery } from "../../lib/ownerFunctions";
import { planViewValidator, planWindowResultValidator } from "../../lib/validators";
import { listWindow as listPlanWindow } from "../../services/plan/events";

export const listWindow = ownerQuery({
  args: {
    anchorDateJst: v.string(),
    paginationOpts: paginationOptsValidator,
    view: planViewValidator,
  },
  handler: async (ctx, args) => listPlanWindow(ctx, ctx.ownerId, args),
  returns: planWindowResultValidator,
});
