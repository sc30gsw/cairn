import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { ValidationFailedError } from "../../lib/errors";
import { throwDomain } from "../../lib/ownerFunctions";
import type { GoalInput } from "../../lib/validators";
import { toGoalDocument } from "./toGoalDocument";
import { upsertWeekSnapshot } from "./upsertWeekSnapshot";
import { validateGoalInput } from "./validateGoalInput";

export const SINGLE_GOAL_MESSAGE = {
  exam: "本番目標は1件までです",
  pace: "ペース目標は1件までです",
} as const satisfies Record<"exam" | "pace", string>;

export type CreateGoalArgs = {
  goal: GoalInput;
  weekStartJst: string;
};

export async function create(
  ctx: MutationCtx,
  ownerId: string,
  args: CreateGoalArgs,
): Promise<Id<"goals">> {
  const { goal } = args;
  const message = validateGoalInput(goal);
  if (message !== null) {
    throwDomain(new ValidationFailedError({ message }));
  }
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
  if (goal.type === "pace") {
    //? 週間ゴールは作成時点の週から効かせる。
    await upsertWeekSnapshot(ctx, ownerId, {
      dailyFloorMinutes: goal.dailyFloorMinutes,
      days: goal.daysPerWeek,
      weekStartJst: args.weekStartJst,
    });
  }
  return goalId;
}
