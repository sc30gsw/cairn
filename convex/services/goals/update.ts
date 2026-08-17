import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { ValidationFailedError } from "../../lib/errors";
import { throwDomain } from "../../lib/ownerFunctions";
import type { GoalInput } from "../../lib/validators";
import { assertGoalInput } from "./assertGoalInput";
import { EMPTY_MASTERY_PROGRESS } from "./masteryProgress";
import { requireOwnedGoal } from "./requireOwnedGoal";
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
  //? 学習量の実績は編集の入力ではない。達成日と同じく据え置く(ADR-0007)。
  const progress =
    existing.type === "mastery"
      ? { activeDays: existing.activeDays, confirmedMinutes: existing.confirmedMinutes }
      : EMPTY_MASTERY_PROGRESS;
  const document = toGoalDocument(goal, ownerId, progress);
  if (document.type === "mastery" && existing.type === "mastery") {
    //? 達成日は setAchieved の担当。期限や基準を編集しても達成の履歴は消さない。
    await ctx.db.replace("goals", existing._id, { ...document, achievedAt: existing.achievedAt });
    return null;
  }
  await ctx.db.replace("goals", existing._id, document);
  return null;
}
