import { v } from "convex/values";

import { internalMutation } from "../../_generated/server";
import { clearConnection as clear } from "../../services/calendarSync/connection";

export const clearConnection = internalMutation({
  args: { ownerId: v.string() },
  handler: async (ctx, args) => clear(ctx, args.ownerId),
  returns: v.boolean(),
});
