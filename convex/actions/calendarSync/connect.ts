"use node";

import { ownerAction } from "../../lib/ownerFunctions";
import { ownerSyncOutcomeValidator } from "../../lib/validators";
import { connect as connectCalendar } from "../../services/calendarSync/connect";

export const connect = ownerAction({
  args: {},
  handler: async (ctx) => connectCalendar(ctx, ctx.ownerId),
  returns: ownerSyncOutcomeValidator,
});
