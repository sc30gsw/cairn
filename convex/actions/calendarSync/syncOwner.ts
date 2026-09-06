"use node";

import { v } from "convex/values";

import { internal } from "../../_generated/api";
import { internalAction } from "../../_generated/server";
import { runOwnerSync } from "../../services/calendarSync/runOwnerSync";

export const syncOwner = internalAction({
  args: { ownerId: v.string() },
  handler: async (ctx, args) => {
    const outcome = await runOwnerSync(ctx, args.ownerId);
    if (outcome === "busy") {
      await ctx.scheduler.runAfter(5000, internal.actions.calendarSync.syncOwner.syncOwner, args);
    }
    return null;
  },
  returns: v.null(),
});
