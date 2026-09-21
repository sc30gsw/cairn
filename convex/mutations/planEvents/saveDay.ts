import { v } from "convex/values";

import { ownerMutation } from "../../lib/ownerFunctions";
import { planEventDraftValidator } from "../../lib/validators";
import { saveDay as saveDayEvents } from "../../services/plan/events";

export const saveDay = ownerMutation({
  args: {
    dateJst: v.string(),
    events: v.array(planEventDraftValidator),
  },
  handler: async (ctx, args) => saveDayEvents(ctx, ctx.ownerId, args),
  returns: v.array(v.id("planEvents")),
});
