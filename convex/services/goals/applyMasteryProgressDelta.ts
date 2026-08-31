import type { Doc } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import {
  type ItemConfirmedTotals,
  masteryProgressDelta,
  sameItemTotals,
  scopedDayTotals,
  shiftMasteryProgress,
} from "./masteryDayTotals";
import { creationDateJst } from "./masteryProgress";
import { masteryProgressOf } from "./masteryProgressOf";

export type MasteryProgressDeltaArgs = Pick<Doc<"rows">, "dateJst"> & {
  after: ItemConfirmedTotals;
  before: ItemConfirmedTotals;
};

export async function applyMasteryProgressDelta(
  ctx: MutationCtx,
  ownerId: string,
  args: MasteryProgressDeltaArgs,
): Promise<null> {
  if (sameItemTotals(args.before, args.after)) {
    return null;
  }
  const goals = await ctx.db
    .query("goals")
    .withIndex("by_owner_and_type", (q) => q.eq("ownerId", ownerId).eq("type", "mastery"))
    .collect();
  await Promise.all(
    goals.flatMap((goal) => {
      if (
        goal.type !== "mastery" ||
        goal.achievedAt !== undefined ||
        creationDateJst(goal._creationTime) > args.dateJst
      ) {
        return [];
      }
      const delta = masteryProgressDelta(
        scopedDayTotals(args.before, goal.scopeItemIds),
        scopedDayTotals(args.after, goal.scopeItemIds),
      );
      return delta.activeDays === 0 && delta.confirmedMinutes === 0
        ? []
        : [ctx.db.patch("goals", goal._id, shiftMasteryProgress(masteryProgressOf(goal), delta))];
    }),
  );
  return null;
}
