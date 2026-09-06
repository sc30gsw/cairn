import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { requireDateJst } from "../../lib/dateArgs";
import { ValidationFailedError } from "../../lib/errors";
import { throwDomain } from "../../lib/ownerFunctions";
import { toeicScoreMessage } from "../../lib/toeicScore";
import type { ExamResultDto } from "../../lib/validators";
import { scheduleGoalSync } from "../calendarSync/scheduleSourceSync";
import { requireOwnedGoal } from "./requireOwnedGoal";

export const NOT_EXAM_GOAL_MESSAGE = "本番の目標ではありません";

export type SetExamResultArgs = {
  goalId: Id<"goals">;
  result: ExamResultDto;
};

export async function setExamResult(
  ctx: MutationCtx,
  ownerId: string,
  args: SetExamResultArgs,
): Promise<null> {
  const goal = await requireOwnedGoal(ctx, ownerId, args.goalId);
  if (goal.type !== "exam") {
    throwDomain(new ValidationFailedError({ message: NOT_EXAM_GOAL_MESSAGE }));
  }
  const scoreMessage = toeicScoreMessage(args.result.score);
  if (scoreMessage !== null) {
    throwDomain(new ValidationFailedError({ message: scoreMessage }));
  }
  requireDateJst(args.result.recordedAt);
  await ctx.db.patch("goals", goal._id, { result: args.result });
  await scheduleGoalSync(ctx, ownerId, [goal._id]);
  return null;
}
