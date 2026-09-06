"use node";

import { ownerAction } from "../../lib/ownerFunctions";
import { ownerSyncOutcomeValidator } from "../../lib/validators";
import { connect as connectCalendar } from "../../services/calendarSync/connect";
import { requireCalendarOperation } from "../../services/calendarSync/operation";

export const connect = ownerAction({
  args: {},
  handler: async (ctx) =>
    requireCalendarOperation(ctx, ctx.ownerId, () => connectCalendar(ctx, ctx.ownerId)),
  returns: ownerSyncOutcomeValidator,
});
