import { v } from "convex/values";

import { validateAvatarStorageMetadata } from "../../lib/avatarStorage";
import { ownerMutation } from "../../lib/ownerFunctions";

export const claimAvatarUpload = ownerMutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    const metadata = await ctx.db.system.get("_storage", args.storageId);
    validateAvatarStorageMetadata(metadata);

    const existing = await ctx.db
      .query("avatarUploads")
      .withIndex("by_storage", (q) => q.eq("storageId", args.storageId))
      .first();

    if (existing !== null && existing.ownerId !== ctx.ownerId) {
      throw new Error("この画像へのアクセス権がありません");
    }

    if (existing === null) {
      await ctx.db.insert("avatarUploads", {
        ownerId: ctx.ownerId,
        storageId: args.storageId,
      });
    }
  },
  returns: v.null(),
});
