import { v } from "convex/values";

import { internalMutation } from "../../_generated/server";
import { purgeExpiredAvatarClaims as purgeExpiredAvatarClaimsService } from "../../services/profile/purgeExpiredAvatarClaims";

export const purgeExpiredAvatarClaims = internalMutation({
  args: { now: v.optional(v.number()) },
  handler: async (ctx, args) => purgeExpiredAvatarClaimsService(ctx, args),
  returns: v.null(),
});
