import { v } from "convex/values";

import { ownerQuery } from "./ownerFunctions";

export const get = ownerQuery({
  args: {},
  handler: async (ctx) => {
    return { ownerId: ctx.ownerId };
  },
  returns: v.object({ ownerId: v.string() }),
});
