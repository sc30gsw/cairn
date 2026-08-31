import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import {
  CHECKPOINT_DEADLINE_REQUIRED_MESSAGE,
  CHECKPOINT_PARENT_KIND_MESSAGE,
  CHECKPOINT_PARENT_REQUIRED_MESSAGE,
  CHECKPOINT_PARENT_SELF_MESSAGE,
} from "../../lib/domain";
import { ValidationFailedError } from "../../lib/errors";
import { throwDomain } from "../../lib/ownerFunctions";
import type { GoalInput } from "../../lib/validators";
import { requireOwnedGoal } from "./requireOwnedGoal";

export type MasteryGoalInput = Extract<GoalInput, Record<"type", "mastery">>;

export async function assertCheckpointParent(
  ctx: MutationCtx,
  ownerId: string,
  input: MasteryGoalInput,
  selfId?: Id<"goals">,
): Promise<null> {
  const { deadline, parentGoalId } = input;
  if (deadline === undefined) {
    if (parentGoalId !== undefined) {
      throwDomain(new ValidationFailedError({ message: CHECKPOINT_DEADLINE_REQUIRED_MESSAGE }));
    }
    return null;
  }
  if (parentGoalId === undefined) {
    throwDomain(new ValidationFailedError({ message: CHECKPOINT_PARENT_REQUIRED_MESSAGE }));
  }
  if (selfId !== undefined && parentGoalId === selfId) {
    throwDomain(new ValidationFailedError({ message: CHECKPOINT_PARENT_SELF_MESSAGE }));
  }
  const parent = await requireOwnedGoal(ctx, ownerId, parentGoalId);
  if (parent.type === "mastery" && parent.deadline !== undefined) {
    throwDomain(new ValidationFailedError({ message: CHECKPOINT_PARENT_KIND_MESSAGE }));
  }
  return null;
}
