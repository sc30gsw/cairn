import { v } from "convex/values";

import { ownerQuery } from "../../lib/ownerFunctions";

export const getAvatarUrl = ownerQuery({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    const claim = await ctx.db
      .query("avatarUploads")
      .withIndex("by_owner_and_storage", (q) =>
        q.eq("ownerId", ctx.ownerId).eq("storageId", args.storageId),
      )
      .first();
    if (claim === null) {
      throw new Error("この画像へのアクセス権がありません");
    }

    const metadata = await ctx.db.system.get("_storage", args.storageId);
    if (metadata === null) {
      throw new Error("アップロードした画像が見つかりません");
    }

    const url = await ctx.storage.getUrl(args.storageId);
    if (url === null) {
      throw new Error("アップロードした画像が見つかりません");
    }
    return url;
  },
  returns: v.string(),
});
