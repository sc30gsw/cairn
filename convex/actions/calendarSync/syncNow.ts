"use node";

import { ownerAction } from "../../lib/ownerFunctions";
import { ownerSyncOutcomeValidator } from "../../lib/validators";
import { runOwnerSync } from "../../services/calendarSync/runOwnerSync";

//? 「今すぐ同期」と、予定タブを開いたときの差分取得（Q14）
export const syncNow = ownerAction({
  args: {},
  handler: async (ctx) => runOwnerSync(ctx, ctx.ownerId),
  returns: ownerSyncOutcomeValidator,
});
