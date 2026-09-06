"use node";

import { ownerAction } from "../../lib/ownerFunctions";
import { ownerSyncOutcomeValidator } from "../../lib/validators";
import { runOwnerSync } from "../../services/calendarSync/runOwnerSync";

export const syncNow = ownerAction({
  args: {},
  handler: async (ctx) => runOwnerSync(ctx, ctx.ownerId),
  returns: ownerSyncOutcomeValidator,
});
