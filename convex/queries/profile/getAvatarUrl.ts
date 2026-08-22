import { v } from "convex/values";

import { validateAvatarStorageMetadata } from "../../lib/avatarStorage";
import { ownerQuery } from "../../lib/ownerFunctions";

export const getAvatarUrl = ownerQuery({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    const metadata = await ctx.db.system.get("_storage", args.storageId);
    validateAvatarStorageMetadata(metadata);

    const url = await ctx.storage.getUrl(args.storageId);
    if (url === null) {
      throw new Error("アップロードした画像が見つかりません");
    }
    return url;
  },
  returns: v.string(),
});
