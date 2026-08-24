import type { Doc } from "../../_generated/dataModel";
import type { GoalDto } from "../../lib/validators";
import { masteryProgressOf } from "./masteryProgressOf";

//* ドキュメントから ownerId を落として DTO にする(CVX-16: 形は validators が SSoT)。
//? 学習量の実績は保存値なので masteryProgressOf でそのまま載せるだけ(導出は書き込み側の責務)。
//? createdAt は _creationTime。並び順を index 順の偶然に頼らないため DTO に載せる。
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
    type: "mastery",
  };
}
