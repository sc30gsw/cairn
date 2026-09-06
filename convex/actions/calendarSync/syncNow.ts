"use node";

import { v } from "convex/values";

import { ownerAction } from "../../lib/ownerFunctions";
import { ownerSyncOutcomeValidator } from "../../lib/validators";
import { runOwnerSync } from "../../services/calendarSync/runOwnerSync";

export const syncNow = ownerAction({
  args: { connectionId: v.optional(v.id("calendarConnections")) },
  handler: async (ctx, args) => runOwnerSync(ctx, ctx.ownerId, args.connectionId),
  returns: ownerSyncOutcomeValidator,
});
