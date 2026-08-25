import { v } from "convex/values";

import { ownerMutation } from "../../lib/ownerFunctions";
import { claimAvatarUpload as claimAvatarUploadService } from "../../services/profile/claimAvatarUpload";

export const claimAvatarUpload = ownerMutation({
  args: {
    claimId: v.id("avatarUploadClaims"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => claimAvatarUploadService(ctx, ctx.ownerId, args),
  returns: v.null(),
});
