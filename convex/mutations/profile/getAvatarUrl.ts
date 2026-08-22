import { v } from "convex/values";

import { ownerMutation } from "../../lib/ownerFunctions";

export const getAvatarUrl = ownerMutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    const url = await ctx.storage.getUrl(args.storageId);
    if (url === null) {
      throw new Error("アップロードした画像が見つかりません");
    }
    return url;
  },
  returns: v.string(),
});
