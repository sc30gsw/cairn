import { v } from "convex/values";

import { ownerMutation } from "../../lib/ownerFunctions";

export const generateAvatarUploadUrl = ownerMutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
  returns: v.string(),
});
