import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { ValidationFailedError } from "../../lib/errors";
import { throwDomain } from "../../lib/ownerFunctions";
import type { GoalInput } from "../../lib/validators";
import { assertCheckpointParent } from "./assertCheckpointParent";
import { assertGoalInput } from "./assertGoalInput";
import { assertNoChildCheckpoints } from "./assertNoChildCheckpoints";
import { assertScopeItems } from "./assertScopeItems";
import { assertScopeUnfrozen } from "./assertScopeUnfrozen";
import { countMasteryProgress } from "./countMasteryProgress";
import { creationDateJst } from "./masteryProgress";
import { masteryProgressOf } from "./masteryProgressOf";
import { requireOwnedGoal } from "./requireOwnedGoal";
import { normalizeScopeItemIds, sameScopeItemIds } from "./scopeItemIds";
import { toGoalDocument } from "./toGoalDocument";

export const GOAL_TYPE_IMMUTABLE_MESSAGE = "目標タイプは変更できません";

export type UpdateGoalArgs = {
  goal: GoalInput;
  goalId: Id<"goals">;
};

export async function update(
  ctx: MutationCtx,
  ownerId: string,
  args: UpdateGoalArgs,
): Promise<null> {
  const existing = await requireOwnedGoal(ctx, ownerId, args.goalId);
  const { goal } = args;
  if (existing.type !== goal.type) {
    throwDomain(new ValidationFailedError({ message: GOAL_TYPE_IMMUTABLE_MESSAGE }));
  }
  assertGoalInput(goal);
  if (goal.type === "exam") {
    if (existing.type !== "exam") {
      throwDomain(new ValidationFailedError({ message: GOAL_TYPE_IMMUTABLE_MESSAGE }));
    }
    //? 本番の結果は編集で消えない（達成日と同じ扱い）
    await ctx.db.replace("goals", existing._id, {
      ...toGoalDocument(goal, ownerId),
      result: existing.result,
    });
    return null;
  }
  if (existing.type !== "mastery") {
    throwDomain(new ValidationFailedError({ message: GOAL_TYPE_IMMUTABLE_MESSAGE }));
  }
  await assertCheckpointParent(ctx, ownerId, goal, existing._id);
  if (goal.deadline !== undefined) {
    await assertNoChildCheckpoints(ctx, ownerId, existing._id);
  }
  assertScopeUnfrozen(existing, goal);
  const scopeItemIds = normalizeScopeItemIds(goal.scopeItemIds);
  await assertScopeItems(ctx, ownerId, scopeItemIds);
  const progress = sameScopeItemIds(existing.scopeItemIds, scopeItemIds)
    ? masteryProgressOf(existing)
    : await countMasteryProgress(ctx, ownerId, {
        scopeItemIds,
        since: creationDateJst(existing._creationTime),
      });
  await ctx.db.replace("goals", existing._id, {
    ...toGoalDocument({ ...goal, ...progress, scopeItemIds }, ownerId),
    achievedAt: existing.achievedAt,
    reflection: existing.reflection,
  });
  return null;
}
