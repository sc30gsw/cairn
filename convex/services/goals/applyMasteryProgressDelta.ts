import type { MutationCtx } from "../../_generated/server";
import { loadDayTotals } from "./loadDayTotals";
import { activeDayDelta } from "./masteryDayTotals";
import { creationDateJst } from "./masteryProgress";

export type MasteryProgressDeltaArgs = {
  confirmedCountDelta: number;
  dateJst: string;
  minutesDelta: number;
};

//* 確定実績を動かした書き込みの「直後」に、同じトランザクションで呼ぶ(CVX-15 / ADR-0007)。
//? 渡す差分はその暦日の実効確定量の変化。書き込み後の合計を読み、そこから差分を引いて変更前を出す。
//? 対象は未達成の習得目標だけ。達成済みは実績を凍結する(達成一覧は履歴なので後の学習で動かさない)。
export async function applyMasteryProgressDelta(
  ctx: MutationCtx,
  ownerId: string,
  args: MasteryProgressDeltaArgs,
): Promise<null> {
  if (args.confirmedCountDelta === 0 && args.minutesDelta === 0) {
    return null;
  }
  const after = await loadDayTotals(ctx, ownerId, args.dateJst);
  const daysDelta = activeDayDelta(
    after.confirmedCount - args.confirmedCountDelta,
    after.confirmedCount,
  );
  if (daysDelta === 0 && args.minutesDelta === 0) {
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
        : [
            ctx.db.patch("goals", goal._id, {
              activeDays: goal.activeDays + daysDelta,
              confirmedMinutes: goal.confirmedMinutes + args.minutesDelta,
            }),
          ],
    ),
  );
  return null;
}
