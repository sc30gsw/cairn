import { v } from "convex/values";

import { ownerQuery } from "../../lib/ownerFunctions";
import { getSession } from "../../services/session/get";

export const get = ownerQuery({
  args: {},
  handler: async (ctx) => getSession(ctx.ownerId),
  returns: v.object({ ownerId: v.string() }),
});
