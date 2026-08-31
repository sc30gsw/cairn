import type { Doc } from "../../_generated/dataModel";
import type { GoalDto } from "../../lib/validators";
import { masteryProgressOf } from "./masteryProgressOf";

export function toGoalDto(goal: Doc<"goals">): GoalDto {
  if (goal.type === "exam") {
    return {
      _id: goal._id,
      content: goal.content,
      createdAt: goal._creationTime,
      examDate: goal.examDate,
      maxScore: goal.maxScore,
      minScore: goal.minScore,
      type: "exam",
    };
  }
  return {
    ...masteryProgressOf(goal),
    _id: goal._id,
    achievedAt: goal.achievedAt,
    content: goal.content,
    createdAt: goal._creationTime,
    criterion: goal.criterion,
    deadline: goal.deadline,
    parentGoalId: goal.parentGoalId,
    scopeItemIds: goal.scopeItemIds,
    type: "mastery",
  };
}
