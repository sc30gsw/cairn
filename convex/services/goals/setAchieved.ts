import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { requireDateJst } from "../../lib/dateArgs";
import { ValidationFailedError } from "../../lib/errors";
import { throwDomain } from "../../lib/ownerFunctions";
import { recomputeMasteryProgress } from "./recomputeMasteryProgress";
import { requireOwnedGoal } from "./requireOwnedGoal";

export const NOT_MASTERY_GOAL_MESSAGE = "習得の目標ではありません";

export type SetAchievedArgs = {
  achievedAt?: string;
  goalId: Id<"goals">;
};

//* 習得の達成は所有者の自己判定。達成日を残し、達成しても目標は消さない(CONTEXT.md「習得」)。
//? achievedAt を省略すると達成を取り消す(patch は undefined でフィールドを落とす)。
export async function setAchieved(
  ctx: MutationCtx,
  ownerId: string,
  args: SetAchievedArgs,
): Promise<null> {
  const goal = await requireOwnedGoal(ctx, ownerId, args.goalId);
  if (goal.type !== "mastery") {
    throwDomain(new ValidationFailedError({ message: NOT_MASTERY_GOAL_MESSAGE }));
  }
  if (args.achievedAt !== undefined) {
    requireDateJst(args.achievedAt);
  }
  //? 達成すると実績は凍結され、以後の確定では動かない。解除は現在進行形への復帰なので、
  //? 凍結中に動いた確定を rows から数え直して保存値を上書きしてから達成日を消す(ADR-0007)。
  if (args.achievedAt === undefined) {
    await recomputeMasteryProgress(ctx, goal);
  }
  await ctx.db.patch("goals", goal._id, { achievedAt: args.achievedAt });
  return null;
}
