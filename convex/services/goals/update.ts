import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { ValidationFailedError } from "../../lib/errors";
import { throwDomain } from "../../lib/ownerFunctions";
import type { GoalInput } from "../../lib/validators";
import { assertCheckpointParent } from "./assertCheckpointParent";
import { assertGoalInput } from "./assertGoalInput";
import { assertNoChildCheckpoints } from "./assertNoChildCheckpoints";
import { masteryProgressOf } from "./masteryProgressOf";
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
  if (goal.type === "exam") {
    await ctx.db.replace("goals", existing._id, toGoalDocument(goal, ownerId));
    return null;
  }
  if (existing.type !== "mastery") {
    //? 上のタイプ一致チェックで弾かれている。型を絞るための保険。
    throwDomain(new ValidationFailedError({ message: GOAL_TYPE_IMMUTABLE_MESSAGE }));
  }
  await assertCheckpointParent(ctx, ownerId, goal, existing._id);
  if (goal.deadline !== undefined) {
    //? 期限を持つ = チェックポイント。自分が子を持つならチェーンになるので拒否(INV-5)。
    await assertNoChildCheckpoints(ctx, ownerId, existing._id);
  }
  //? 学習量の実績は編集の入力ではない。達成日と同じく据え置く(ADR-0007)。読み出しは
  //? masteryProgressOf に通し、2フィールドをここで書き並べない(CVX-16)。
  await ctx.db.replace("goals", existing._id, {
    ...toGoalDocument({ ...goal, ...masteryProgressOf(existing) }, ownerId),
    achievedAt: existing.achievedAt,
  });
  return null;
}
