import type { MutationCtx } from "../../_generated/server";
import { recomputeMasteryProgress } from "./recomputeMasteryProgress";

//* 所有者の未達成の習得目標すべてのカウンタを rows から作り直す(ADR-0007 の修復手段)。
//? 達成済みは達成時点で凍結された履歴なので数え直さない(setAchieved の解除だけが復帰させる)。
//? 1所有者の習得目標は数件。type で絞ってから collect(CVX-10/11)。
export async function recomputeMasteryProgressForOwner(
  ctx: MutationCtx,
  ownerId: string,
): Promise<null> {
  const goals = await ctx.db
    .query("goals")
    .withIndex("by_owner_and_type", (q) => q.eq("ownerId", ownerId).eq("type", "mastery"))
    .collect();
  await Promise.all(
    goals.flatMap((goal) =>
      goal.type === "mastery" && goal.achievedAt === undefined
        ? [recomputeMasteryProgress(ctx, goal)]
        : [],
    ),
  );
  return null;
}
