import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { normalizeReflection } from "../../lib/achievementReflection";
import { requireDateJst } from "../../lib/dateArgs";
import { ValidationFailedError } from "../../lib/errors";
import { throwDomain } from "../../lib/ownerFunctions";
import { recomputeMasteryProgress } from "./recomputeMasteryProgress";
import { requireOwnedGoal } from "./requireOwnedGoal";

export const NOT_MASTERY_GOAL_MESSAGE = "習得の目標ではありません";

export type SetAchievedArgs = {
  achievedAt?: string;
  goalId: Id<"goals">;
  reflection?: string;
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
  if (args.achievedAt === undefined) {
    //? 達成を外しても振り返りは残す。次に達成にするときの初期値になる
    await recomputeMasteryProgress(ctx, goal);
    await ctx.db.patch("goals", goal._id, { achievedAt: undefined });
    return null;
  }
  requireDateJst(args.achievedAt);
  const reflection = normalizeReflection(args.reflection);
  await ctx.db.patch("goals", goal._id, {
    achievedAt: args.achievedAt,
    reflection: args.reflection === undefined ? goal.reflection : reflection,
  });
  return null;
}
