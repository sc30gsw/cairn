import { v } from "convex/values";

import { internalQuery } from "../../_generated/server";
import { syncPlanValidator } from "../../lib/validators";
import { syncPlan as buildSyncPlan } from "../../services/calendarSync/syncPlan";

export const syncPlan = internalQuery({
  args: {
    connectionId: v.optional(v.id("calendarConnections")),
    ownerId: v.string(),
    todayJst: v.string(),
  },
  handler: async (ctx, args) => buildSyncPlan(ctx, args),
  returns: syncPlanValidator,
});
