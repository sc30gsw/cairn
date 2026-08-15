import { v } from "convex/values";

import { ensureCatalog } from "./ensureCatalog";
import { ownerMutation } from "./ownerFunctions";

export const ensure = ownerMutation({
  args: {},
  handler: async (ctx) => {
    await ensureCatalog(ctx, ctx.ownerId);
    return null;
  },
  returns: v.null(),
});
