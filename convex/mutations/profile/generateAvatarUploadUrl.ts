import { v } from "convex/values";

import { ownerMutation } from "../../lib/ownerFunctions";

export const generateAvatarUploadUrl = ownerMutation({
  args: {},
  handler: async (ctx) => {
    const [claimId, uploadUrl] = await Promise.all([
      ctx.db.insert("avatarUploadClaims", { ownerId: ctx.ownerId }),
      ctx.storage.generateUploadUrl(),
    ]);
    return { claimId, uploadUrl };
  },
  returns: v.object({
    claimId: v.id("avatarUploadClaims"),
    uploadUrl: v.string(),
  }),
});
