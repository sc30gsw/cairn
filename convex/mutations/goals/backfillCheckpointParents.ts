import { v } from "convex/values";

import { internalMutation } from "../../_generated/server";
import { backfillCheckpointParentsResultValidator } from "../../lib/validators";
import { backfillCheckpointParents as backfill } from "../../services/goals/backfillCheckpointParents";

export const backfillCheckpointParents = internalMutation({
  args: { ownerId: v.string() },
  handler: async (ctx, args) => backfill(ctx, args.ownerId),
  returns: backfillCheckpointParentsResultValidator,
});
