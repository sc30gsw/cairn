import type { Doc } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import {
  type ConfirmedDayTotals,
  masteryProgressDelta,
  shiftMasteryProgress,
} from "./masteryDayTotals";
import { creationDateJst } from "./masteryProgress";
import { masteryProgressOf } from "./masteryProgressOf";

export type MasteryProgressDeltaArgs = Pick<Doc<"rows">, "dateJst"> & {
  after: ConfirmedDayTotals;
  before: ConfirmedDayTotals;
};

//* 確定実績を動かした書き込みの「直後」に、同じトランザクションで呼ぶ(CVX-15 / ADR-0007)。
//? 前後の日合計は呼び出し側が実測して渡す(withMasteryProgressDelta が唯一の入口)。
//? 対象は未達成の習得目標だけ。達成済みは実績を凍結する(達成一覧は履歴なので後の学習で動かさない)。
export async function applyMasteryProgressDelta(
  ctx: MutationCtx,
  ownerId: string,
  args: MasteryProgressDeltaArgs,
): Promise<null> {
  const delta = masteryProgressDelta(args.before, args.after);
  if (delta.activeDays === 0 && delta.confirmedMinutes === 0) {
    return null;
  }
  //? 1所有者の習得目標は数件。type で絞ってから collect(CVX-10/11)。
  const goals = await ctx.db
    .query("goals")
    .withIndex("by_owner_and_type", (q) => q.eq("ownerId", ownerId).eq("type", "mastery"))
    .collect();
  await Promise.all(
    goals.flatMap((goal) =>
      goal.type !== "mastery" ||
      goal.achievedAt !== undefined ||
      creationDateJst(goal._creationTime) > args.dateJst
        ? []
        : [ctx.db.patch("goals", goal._id, shiftMasteryProgress(masteryProgressOf(goal), delta))],
    ),
  );
  return null;
}
