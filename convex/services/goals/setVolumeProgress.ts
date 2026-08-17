import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { ValidationFailedError } from "../../lib/errors";
import { throwDomain } from "../../lib/ownerFunctions";
import { requireOwnedGoal } from "./requireOwnedGoal";
import { VOLUME_AMOUNT_MESSAGE } from "./validateGoalInput";

export const NOT_VOLUME_GOAL_MESSAGE = "達成量の目標ではありません";

export async function setVolumeProgress(
  ctx: MutationCtx,
  ownerId: string,
  args: { currentAmount: number; goalId: Id<"goals"> },
): Promise<null> {
  const goal = await requireOwnedGoal(ctx, ownerId, args.goalId);
  if (goal.type !== "volume") {
    throwDomain(new ValidationFailedError({ message: NOT_VOLUME_GOAL_MESSAGE }));
  }
  //? NaN は `< 0` を素通りするので、整数判定で先に落とす。
  if (!Number.isInteger(args.currentAmount) || args.currentAmount < 0) {
    throwDomain(new ValidationFailedError({ message: VOLUME_AMOUNT_MESSAGE }));
  }
  await ctx.db.patch("goals", goal._id, { currentAmount: args.currentAmount });
  return null;
}
