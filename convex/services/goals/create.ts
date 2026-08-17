import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { ValidationFailedError } from "../../lib/errors";
import { todayJst } from "../../lib/jst";
import { throwDomain } from "../../lib/ownerFunctions";
import type { GoalInput } from "../../lib/validators";
import { assertGoalInput } from "./assertGoalInput";
import { loadDayTotals } from "./loadDayTotals";
import { initialMasteryProgress } from "./masteryDayTotals";
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
    return await ctx.db.insert("goals", toGoalDocument(goal, ownerId));
  }
  //? 学習量の実績は作成日を起点にする。作成と同じ暦日に既にある確定は実績に入る(ADR-0007)。
  //? mutation なので Date.now() を読んでよい(CVX-14 は query だけの制約)。
  const progress = initialMasteryProgress(await loadDayTotals(ctx, ownerId, todayJst()));
  return await ctx.db.insert("goals", toGoalDocument({ ...goal, ...progress }, ownerId));
}
