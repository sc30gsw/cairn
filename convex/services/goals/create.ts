import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { ValidationFailedError } from "../../lib/errors";
import { throwDomain } from "../../lib/ownerFunctions";
import type { GoalInput } from "../../lib/validators";
import { assertGoalInput } from "./assertGoalInput";
import { toGoalDocument } from "./toGoalDocument";

export const SINGLE_EXAM_GOAL_MESSAGE = "本番目標は1件までです";

export type CreateGoalArgs = Record<"goal", GoalInput>;

//* 本番目標は1件だけ。習得(チェックポイントを含む)は何件でも持てる(CONTEXT.md「目標」)。
export async function create(
  ctx: MutationCtx,
  ownerId: string,
  args: CreateGoalArgs,
): Promise<Id<"goals">> {
  const { goal } = args;
  assertGoalInput(goal);
  if (goal.type === "exam") {
    const existing = await ctx.db
      .query("goals")
      .withIndex("by_owner_and_type", (q) => q.eq("ownerId", ownerId).eq("type", "exam"))
      .first();
    if (existing !== null) {
      throwDomain(new ValidationFailedError({ message: SINGLE_EXAM_GOAL_MESSAGE }));
    }
  }
  return await ctx.db.insert("goals", toGoalDocument(goal, ownerId));
}
