import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { ValidationFailedError } from "../../lib/errors";
import { throwDomain } from "../../lib/ownerFunctions";
import type { GoalInput } from "../../lib/validators";
import { requireOwnedGoal } from "./requireOwnedGoal";
import { toGoalDocument } from "./toGoalDocument";
import { upsertWeekSnapshot } from "./upsertWeekSnapshot";
import { validateGoalInput } from "./validateGoalInput";

export const GOAL_TYPE_IMMUTABLE_MESSAGE = "目標タイプは変更できません";

export type UpdateGoalArgs = {
  goal: GoalInput;
  goalId: Id<"goals">;
  weekStartJst: string;
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
  const message = validateGoalInput(goal);
  if (message !== null) {
    throwDomain(new ValidationFailedError({ message }));
  }
  const document = toGoalDocument(goal, ownerId);
  if (document.type === "volume" && existing.type === "volume") {
    //? 現在量は setVolumeProgress の担当。編集で巻き戻さない。
    await ctx.db.replace("goals", existing._id, {
      ...document,
      currentAmount: existing.currentAmount,
    });
  } else {
    await ctx.db.replace("goals", existing._id, document);
  }
  if (goal.type === "pace") {
    await upsertWeekSnapshot(ctx, ownerId, {
      dailyFloorMinutes: goal.dailyFloorMinutes,
      days: goal.daysPerWeek,
      weekStartJst: args.weekStartJst,
    });
  }
  return null;
}
