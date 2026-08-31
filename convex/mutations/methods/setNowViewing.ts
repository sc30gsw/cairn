import { v } from "convex/values";

import { ownerMutation } from "../../lib/ownerFunctions";
import { setNowViewing as setMethodNowViewing } from "../../services/methods/setNowViewing";

export const setNowViewing = ownerMutation({
  args: { methodId: v.id("methods"), nowViewing: v.boolean() },
  handler: async (ctx, args) => setMethodNowViewing(ctx, ctx.ownerId, args),
  returns: v.null(),
});
