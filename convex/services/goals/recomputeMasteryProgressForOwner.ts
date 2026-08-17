import type { MutationCtx } from "../../_generated/server";
import { loadLiveRows } from "../rows/loadLiveRows";
import { creationDateJst, masteryProgressSince } from "./masteryProgress";

//* 所有者の未達成の習得目標すべてのカウンタを rows から作り直す(ADR-0007 の修復手段)。
//? 達成済みは達成時点で凍結された履歴なので数え直さない(setAchieved の解除だけが復帰させる)。
//? 目標ごとに rows を読むと同じ範囲を何度も collect することになるので、いちばん古い作成日から
//? 一度だけ読み、あとは各目標の起点で純関数側に絞らせる(CVX-11)。
export async function recomputeMasteryProgressForOwner(
  ctx: MutationCtx,
  ownerId: string,
): Promise<null> {
  //? 1所有者の習得目標は数件。type で絞ってから collect(CVX-10/11)。
  const goals = await ctx.db
    .query("goals")
    .withIndex("by_owner_and_type", (q) => q.eq("ownerId", ownerId).eq("type", "mastery"))
    .collect();
  const targets = goals.flatMap((goal) =>
    goal.type === "mastery" && goal.achievedAt === undefined
      ? [{ goalId: goal._id, since: creationDateJst(goal._creationTime) }]
      : [],
  );
  const earliest = targets.reduce<string | undefined>(
    (oldest, target) => (oldest === undefined || target.since < oldest ? target.since : oldest),
    undefined,
  );
  if (earliest === undefined) {
    return null;
  }
  const { rows } = await loadLiveRows(ctx, ownerId, { from: earliest });
  await Promise.all(
    targets.map(({ goalId, since }) =>
      ctx.db.patch("goals", goalId, masteryProgressSince(rows, since)),
    ),
  );
  return null;
}
