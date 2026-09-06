import { v } from "convex/values";

import { internalMutation } from "../../_generated/server";
import {
  calendarSyncSourceKindValidator,
  pushExpectationValidator,
  pushOutcomeValidator,
  recordPushResultValidator,
} from "../../lib/validators";
import { recordPush as recordPushOutcome } from "../../services/calendarSync/recordPush";

export const recordPush = internalMutation({
  args: {
    connectionId: v.optional(v.id("calendarConnections")),
    generation: v.optional(v.number()),
    calendarId: v.string(),
    expected: pushExpectationValidator,
    outcome: pushOutcomeValidator,
    ownerId: v.string(),
    sourceId: v.string(),
    sourceKind: calendarSyncSourceKindValidator,
  },
  handler: async (ctx, args) => recordPushOutcome(ctx, args),
  returns: recordPushResultValidator,
});
