import { v } from "convex/values";

import { ownerQuery } from "../../lib/ownerFunctions";
import { historySearchValidator } from "../../lib/validators";
import { search as searchHistory } from "../../services/history/search";

export const search = ownerQuery({
  args: { fromJst: v.optional(v.string()), query: v.string() },
  handler: async (ctx, args) => searchHistory(ctx, ctx.ownerId, args),
  returns: historySearchValidator,
});
