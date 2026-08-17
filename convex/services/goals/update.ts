import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { VOLUME_AMOUNT_LIMITS } from "../../lib/domain";
import { ValidationFailedError } from "../../lib/errors";
import { throwDomain } from "../../lib/ownerFunctions";
import { prepareGoalWrite, type GoalWriteArgs } from "./prepareGoalWrite";
import { requireOwnedGoal } from "./requireOwnedGoal";
import { syncPaceSnapshot } from "./syncPaceSnapshot";
import { toGoalDocument } from "./toGoalDocument";

export const GOAL_TYPE_IMMUTABLE_MESSAGE = "目標タイプは変更できません";

export type UpdateGoalArgs = GoalWriteArgs & {
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
  const weekStartJst = await prepareGoalWrite(ctx, ownerId, args);
  const document = toGoalDocument(goal, ownerId);
  if (document.type === "volume" && existing.type === "volume") {
    //? 現在量は setVolumeProgress の担当。編集で巻き戻さない。
    //? ただし開始量を引き上げた編集で現在量が [開始量, 目標量] の外に落ちるので、下端だけ揃える。
    //? 上端は締めない(超過達成はそのまま残す)。
    await ctx.db.replace("goals", existing._id, {
      ...document,
      currentAmount: Math.max(
        existing.currentAmount,
        document.startAmount ?? VOLUME_AMOUNT_LIMITS.minStart,
      ),
    });
  } else {
    await ctx.db.replace("goals", existing._id, document);
  }
  await syncPaceSnapshot(ctx, ownerId, goal, weekStartJst);
  return null;
}
