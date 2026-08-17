import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { ValidationFailedError } from "../../lib/errors";
import { throwDomain } from "../../lib/ownerFunctions";
import { prepareGoalWrite, type GoalWriteArgs } from "./prepareGoalWrite";
import { syncPaceSnapshot } from "./syncPaceSnapshot";
import { toGoalDocument } from "./toGoalDocument";

export const SINGLE_GOAL_MESSAGE = {
  exam: "本番目標は1件までです",
  pace: "ペース目標は1件までです",
} as const satisfies Record<"exam" | "pace", string>;

export type CreateGoalArgs = GoalWriteArgs;

export async function create(
  ctx: MutationCtx,
  ownerId: string,
  args: CreateGoalArgs,
): Promise<Id<"goals">> {
  const { goal } = args;
  const weekStartJst = await prepareGoalWrite(ctx, ownerId, args);
  if (goal.type === "exam" || goal.type === "pace") {
    const goalType = goal.type;
    const existing = await ctx.db
      .query("goals")
      .withIndex("by_owner_and_type", (q) => q.eq("ownerId", ownerId).eq("type", goalType))
      .first();
    if (existing !== null) {
      throwDomain(new ValidationFailedError({ message: SINGLE_GOAL_MESSAGE[goalType] }));
    }
  }
  const goalId = await ctx.db.insert("goals", toGoalDocument(goal, ownerId));
  await syncPaceSnapshot(ctx, ownerId, goal, weekStartJst);
  return goalId;
}
