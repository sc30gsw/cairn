"use node";

import { v } from "convex/values";

import { internalAction } from "../../_generated/server";
import { runOwnerSync } from "../../services/calendarSync/runOwnerSync";

export const syncOwner = internalAction({
  args: { ownerId: v.string() },
  handler: async (ctx, args) => {
    await runOwnerSync(ctx, args.ownerId);
    return null;
  },
  returns: v.null(),
});
