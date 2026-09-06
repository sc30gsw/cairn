"use node";

import { v } from "convex/values";

import { ownerAction } from "../../lib/ownerFunctions";
import { changeOutput } from "../../services/calendarSync/changeOutput";
import { requireCalendarOperation } from "../../services/calendarSync/operation";

export const setOutput = ownerAction({
  args: { connectionId: v.id("calendarConnections"), calendarId: v.string() },
  returns: v.union(v.literal("ok"), v.literal("moving")),
  handler: async (ctx, args) =>
    requireCalendarOperation(ctx, ctx.ownerId, () =>
      changeOutput(ctx, { ...args, ownerId: ctx.ownerId }),
    ),
});
