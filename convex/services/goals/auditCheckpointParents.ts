import type { QueryCtx } from "../../_generated/server";
import { CHECKPOINT_AUDIT_LIMIT } from "../../lib/domain";
import type { CheckpointParentAudit } from "../../lib/validators";
import { summarizeCheckpointParents } from "./summarizeCheckpointParents";

export async function auditCheckpointParents(ctx: QueryCtx): Promise<CheckpointParentAudit> {
  const goals = await ctx.db.query("goals").take(CHECKPOINT_AUDIT_LIMIT + 1);
  const truncated = goals.length > CHECKPOINT_AUDIT_LIMIT;

  return summarizeCheckpointParents(goals.slice(0, CHECKPOINT_AUDIT_LIMIT), truncated);
}
