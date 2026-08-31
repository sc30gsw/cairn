import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { CHECKPOINT_HAS_CHILDREN_MESSAGE } from "../../lib/domain";
import { ValidationFailedError } from "../../lib/errors";
import { throwDomain } from "../../lib/ownerFunctions";
import { listChildCheckpoints } from "./listChildCheckpoints";

export async function assertNoChildCheckpoints(
  ctx: MutationCtx,
  ownerId: string,
  goalId: Id<"goals">,
): Promise<null> {
  const children = await listChildCheckpoints(ctx, ownerId, goalId);
  if (children.length > 0) {
    throwDomain(new ValidationFailedError({ message: CHECKPOINT_HAS_CHILDREN_MESSAGE }));
  }
  return null;
}
