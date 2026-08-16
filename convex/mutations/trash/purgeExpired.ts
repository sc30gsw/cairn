import { v } from "convex/values";

import { internalMutation } from "../../_generated/server";
import { purgeExpired as purgeExpiredTrash } from "../../services/trash/purgeExpired";

export const purgeExpired = internalMutation({
  args: { now: v.optional(v.number()) },
  handler: async (ctx, args) => purgeExpiredTrash(ctx, args),
  returns: v.null(),
});
