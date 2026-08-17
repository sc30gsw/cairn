import type { Doc } from "../../_generated/dataModel";
import type { GoalDto } from "../../lib/validators";

//* ドキュメントから ownerId / _creationTime を落として DTO にする(CVX-16: 形は validators が SSoT)。
export function toGoalDto(goal: Doc<"goals">): GoalDto {
  switch (goal.type) {
    case "exam":
      return {
        _id: goal._id,
        content: goal.content,
        examDate: goal.examDate,
        maxScore: goal.maxScore,
        minScore: goal.minScore,
        type: "exam",
      };
    case "pace":
      return {
        _id: goal._id,
        content: goal.content,
        dailyFloorMinutes: goal.dailyFloorMinutes,
        daysPerWeek: goal.daysPerWeek,
        type: "pace",
      };
    case "volume":
      return {
        _id: goal._id,
        content: goal.content,
        currentAmount: goal.currentAmount,
        deadline: goal.deadline,
        itemId: goal.itemId,
        startAmount: goal.startAmount,
        targetAmount: goal.targetAmount,
        type: "volume",
        unit: goal.unit,
      };
    case "mastery":
      return {
        _id: goal._id,
        content: goal.content,
        criterion: goal.criterion,
        deadline: goal.deadline,
        type: "mastery",
      };
    default:
      return {
        _id: goal._id,
        content: goal.content,
        deadline: goal.deadline,
        memo: goal.memo,
        type: "other",
      };
  }
}
