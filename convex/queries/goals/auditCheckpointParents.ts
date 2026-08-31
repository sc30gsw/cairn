import { internalQuery } from "../../_generated/server";
import { checkpointParentAuditValidator } from "../../lib/validators";
import { auditCheckpointParents as audit } from "../../services/goals/auditCheckpointParents";

export const auditCheckpointParents = internalQuery({
  args: {},
  handler: async (ctx) => audit(ctx),
  returns: checkpointParentAuditValidator,
});
