import { v } from "convex/values";

import { ownerMutation } from "../../lib/ownerFunctions";
import { planPriorityValidator } from "../../lib/validators";
import { save as saveEvent } from "../../services/plan/events";

export const save = ownerMutation({
  args: {
    dateJst: v.string(),
    endTime: v.string(),
    eventId: v.optional(v.id("planEvents")),
    itemId: v.optional(v.id("items")),
    priority: planPriorityValidator,
    startTime: v.string(),
    title: v.string(),
    todayJst: v.string(),
  },
  handler: async (ctx, args) => saveEvent(ctx, ctx.ownerId, args),
  returns: v.id("planEvents"),
});
