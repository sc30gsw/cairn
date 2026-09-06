import { v } from "convex/values";

import { internalQuery } from "../../_generated/server";
import { calendarSyncSourceKindValidator, pushPlanValidator } from "../../lib/validators";
import { pushPlan as buildPushPlan } from "../../services/calendarSync/pushPlan";

export const pushPlan = internalQuery({
  args: { ownerId: v.string(), sourceId: v.string(), sourceKind: calendarSyncSourceKindValidator },
  handler: async (ctx, args) => buildPushPlan(ctx, args),
  returns: pushPlanValidator,
});
