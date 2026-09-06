"use node";

import { ownerAction } from "../../lib/ownerFunctions";
import { ownerSyncOutcomeValidator } from "../../lib/validators";
import { requireCalendarOperation } from "../../services/calendarSync/operation";
import { syncConnectedOwner } from "../../services/calendarSync/runOwnerSync";

export const syncNow = ownerAction({
  args: {},
  handler: async (ctx) =>
    requireCalendarOperation(ctx, ctx.ownerId, () => syncConnectedOwner(ctx, ctx.ownerId)),
  returns: ownerSyncOutcomeValidator,
});
