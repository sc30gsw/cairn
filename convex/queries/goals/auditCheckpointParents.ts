import { internalQuery } from "../../_generated/server";
import { checkpointParentAuditValidator } from "../../lib/validators";
import { auditCheckpointParents as audit } from "../../services/goals/auditCheckpointParents";

//* 全所有者の ownerId を返すので絶対に公開しない(CVX-01/04)。#49 の移行ゲートとして人が読む。
export const auditCheckpointParents = internalQuery({
  args: {},
  handler: async (ctx) => audit(ctx),
  returns: checkpointParentAuditValidator,
});
