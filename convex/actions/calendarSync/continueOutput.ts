"use node";

import { v } from "convex/values";

import { internal } from "../../_generated/api";
import { internalAction } from "../../_generated/server";
import { continueOutputChange } from "../../services/calendarSync/changeOutput";
import { withCalendarOperation } from "../../services/calendarSync/operation";

export const continueOutput = internalAction({
  args: { ownerId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const operation = await withCalendarOperation(ctx, args.ownerId, () =>
      continueOutputChange(ctx, args.ownerId),
    );
    if (!operation.acquired)
      await ctx.scheduler.runAfter(
        5000,
        internal.actions.calendarSync.continueOutput.continueOutput,
        args,
      );
    return null;
  },
});
