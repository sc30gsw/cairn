import type { QueryCtx } from "../../_generated/server";
import { DEFAULT_EXAM_GOAL } from "../../lib/catalog";
import { daysUntil } from "../../lib/jst";

export async function getExam(ctx: QueryCtx, ownerId: string, args: { todayJst: string }) {
  const goal = await ctx.db
    .query("examGoals")
    .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
    .unique();
  const examDate = goal?.examDate ?? DEFAULT_EXAM_GOAL.examDate;
  const maxScore = goal?.maxScore ?? DEFAULT_EXAM_GOAL.maxScore;
  const minScore = goal?.minScore ?? DEFAULT_EXAM_GOAL.minScore;
  return {
    daysRemaining: daysUntil(args.todayJst, examDate),
    examDate,
    maxScore,
    minScore,
  };
}
