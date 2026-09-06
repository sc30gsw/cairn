import { v } from "convex/values";

import { internalMutation } from "../../_generated/server";
import { calendarSyncSourceKindValidator, pushOutcomeValidator } from "../../lib/validators";
import { recordPush as recordPushOutcome } from "../../services/calendarSync/recordPush";

export const recordPush = internalMutation({
  args: {
    calendarId: v.string(),
    outcome: pushOutcomeValidator,
    ownerId: v.string(),
    sourceId: v.string(),
    sourceKind: calendarSyncSourceKindValidator,
  },
  handler: async (ctx, args) => recordPushOutcome(ctx, args),
  returns: v.null(),
});
