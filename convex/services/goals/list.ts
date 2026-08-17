import type { Doc } from "../../_generated/dataModel";
import type { QueryCtx } from "../../_generated/server";
import type { GoalDto } from "../../lib/validators";
import { liveDayDatesFrom, liveRows } from "../history/shared";
import { creationDateJst, EMPTY_MASTERY_PROGRESS, masteryProgressSince } from "./masteryProgress";
import { toGoalDto } from "./toGoalDto";

function masterySinceDates(goals: readonly Doc<"goals">[]): string[] {
  return goals.flatMap((goal) =>
    goal.type === "mastery" ? [creationDateJst(goal._creationTime)] : [],
  );
}

//? 1所有者の目標は数件〜数十件。by_owner_and_type で所有者に絞ってから collect(CVX-11)。
export async function list(ctx: QueryCtx, ownerId: string): Promise<GoalDto[]> {
  const goals = await ctx.db
    .query("goals")
    .withIndex("by_owner_and_type", (q) => q.eq("ownerId", ownerId))
    .collect();
  const sinceDates = masterySinceDates(goals);
  if (sinceDates.length === 0) {
    return goals.map((goal) => toGoalDto(goal, EMPTY_MASTERY_PROGRESS));
  }
  //? 実績の窓は「一番古い習得目標を作った日」以降の1回だけ。目標ごとの切り出しは TS 側で行う。
  //? 目標の数だけ db.query を回さない(CVX-10: index 必須 / CVX-11: 範囲を絞ってから collect)。
  const since = sinceDates.reduce((oldest, dateJst) => (dateJst < oldest ? dateJst : oldest));
  const [rows, days] = await Promise.all([
    ctx.db
      .query("rows")
      .withIndex("by_owner_and_date", (q) => q.eq("ownerId", ownerId).gte("dateJst", since))
      .collect(),
    ctx.db
      .query("days")
      .withIndex("by_owner_and_date", (q) => q.eq("ownerId", ownerId).gte("dateJst", since))
      .collect(),
  ]);
  const countedRows = liveRows(rows, liveDayDatesFrom(days));
  return goals.map((goal) =>
    toGoalDto(
      goal,
      goal.type === "mastery"
        ? masteryProgressSince(countedRows, creationDateJst(goal._creationTime))
        : EMPTY_MASTERY_PROGRESS,
    ),
  );
}
