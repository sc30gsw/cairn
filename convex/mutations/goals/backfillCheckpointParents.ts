import { v } from "convex/values";

import { internalMutation } from "../../_generated/server";
import { backfillCheckpointParentsResultValidator } from "../../lib/validators";
import { backfillCheckpointParents as backfill } from "../../services/goals/backfillCheckpointParents";

//* 所有者を引数に取る internal な修復入口(#49 Phase 3)。recomputeMasteryProgress と同じ前例。
//? scheduler / crons からは呼ばない。クライアントからも呼べない(CVX-01/05)。
export const backfillCheckpointParents = internalMutation({
  args: { ownerId: v.string() },
  handler: async (ctx, args) => backfill(ctx, args.ownerId),
  returns: backfillCheckpointParentsResultValidator,
});
