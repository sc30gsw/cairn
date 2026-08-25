import { v } from "convex/values";

import { ownerQuery } from "../../lib/ownerFunctions";
import { getAvatarUrl as getAvatarUrlService } from "../../services/profile/getAvatarUrl";

export const getAvatarUrl = ownerQuery({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => getAvatarUrlService(ctx, ctx.ownerId, args),
  returns: v.union(v.string(), v.null()),
});
