import { v } from "convex/values";

import { ownerQuery } from "../../lib/ownerFunctions";

export const getAvatarUrl = ownerQuery({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    const owned = await ctx.db
      .query("avatarUploads")
      .withIndex("by_owner_and_storage", (q) =>
        q.eq("ownerId", ctx.ownerId).eq("storageId", args.storageId),
      )
      .unique();
    if (owned === null) {
      throw new Error("この画像にアクセスする権限がありません");
    }

    const url = await ctx.storage.getUrl(args.storageId);
    if (url === null) {
      throw new Error("アップロードした画像が見つかりません");
    }
    return url;
  },
  returns: v.string(),
});
