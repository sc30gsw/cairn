import type { FunctionReturnType } from "convex/server";

import type { api } from "~/../convex/_generated/api";
import type { Id } from "~/../convex/_generated/dataModel";

export type PlanGoalRead = {
  _id: Id<"goals">;
  content: string;
  deadline?: string;
  examDate?: string;
  type: "exam" | "mastery";
};

export const PLAN_GOALS_EDIT_HREF = "/goals";
export const PLAN_GOALS_EDIT_LABEL = "目標ページで編集";
export const PLAN_GOALS_EMPTY_MESSAGE = "目標はまだありません。";

export function toPlanGoalRead(
  goal: FunctionReturnType<typeof api.queries.goals.list.list>[number],
): PlanGoalRead {
  if (goal.type === "exam") {
    return {
      _id: goal._id,
      content: goal.content,
      examDate: goal.examDate,
      type: "exam",
    };
  }
  return {
    _id: goal._id,
    content: goal.content,
    deadline: goal.deadline,
    type: "mastery",
  };
}
