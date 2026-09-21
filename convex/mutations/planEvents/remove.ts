import { v } from "convex/values";

import { ownerMutation } from "../../lib/ownerFunctions";
import { remove as removeEvent } from "../../services/plan/events";

export const remove = ownerMutation({
  args: { eventId: v.id("planEvents") },
  handler: async (ctx, args) => removeEvent(ctx, ctx.ownerId, args),
  returns: v.null(),
});
