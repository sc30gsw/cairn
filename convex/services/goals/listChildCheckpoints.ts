import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { compareDateJst } from "../../lib/jst";
import type { MasteryGoal } from "./masteryProgressOf";

export async function listChildCheckpoints(
  ctx: MutationCtx,
  ownerId: string,
  goalId: Id<"goals">,
): Promise<MasteryGoal[]> {
  const mastery = await ctx.db
    .query("goals")
    .withIndex("by_owner_and_type", (q) => q.eq("ownerId", ownerId).eq("type", "mastery"))
    .collect();

  return mastery
    .filter((goal): goal is MasteryGoal => goal.type === "mastery" && goal.parentGoalId === goalId)
    .sort((left, right) => compareDateJst(left.deadline ?? "", right.deadline ?? ""));
}
