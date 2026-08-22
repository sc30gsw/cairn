import { v } from "convex/values";

import { validateAvatarStorageMetadata } from "../../lib/avatarStorage";
import { ownerMutation } from "../../lib/ownerFunctions";

export const claimAvatarUpload = ownerMutation({
  args: {
    claimId: v.id("avatarUploadClaims"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const claim = await ctx.db.get(args.claimId);
    if (claim === null || claim.ownerId !== ctx.ownerId) {
      throw new Error("アップロードの認可が無効です");
    }

    const existing = await ctx.db
      .query("avatarUploads")
      .withIndex("by_storage", (q) => q.eq("storageId", args.storageId))
      .unique();
    if (existing !== null && existing.ownerId !== ctx.ownerId) {
      throw new Error("この画像は別のアカウントに紐づいています");
    }

    const metadata = await ctx.db.system.get("_storage", args.storageId);
    validateAvatarStorageMetadata(metadata);

    if (existing === null) {
      await ctx.db.insert("avatarUploads", {
        ownerId: ctx.ownerId,
        storageId: args.storageId,
      });
    }

    await ctx.db.delete(args.claimId);
  },
  returns: v.null(),
});
