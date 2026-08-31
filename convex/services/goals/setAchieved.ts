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
  if (args.achievedAt === undefined) {
    await recomputeMasteryProgress(ctx, goal);
  }
  await ctx.db.patch("goals", goal._id, { achievedAt: args.achievedAt });
  return null;
}
