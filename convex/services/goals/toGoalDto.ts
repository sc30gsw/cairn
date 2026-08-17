import type { Doc } from "../../_generated/dataModel";
import type { GoalDto } from "../../lib/validators";
import type { MasteryProgress } from "./masteryProgress";

//* ドキュメントから ownerId / _creationTime を落として DTO にする(CVX-16: 形は validators が SSoT)。
//? 学習量の実績は保存された値ではないので、習得の枝にだけ list が計算した値を載せる。
export function toGoalDto(goal: Doc<"goals">, progress: MasteryProgress): GoalDto {
  if (goal.type === "exam") {
    return {
      _id: goal._id,
      content: goal.content,
      examDate: goal.examDate,
      maxScore: goal.maxScore,
      minScore: goal.minScore,
      type: "exam",
    };
  }
  return {
    _id: goal._id,
    achievedAt: goal.achievedAt,
    activeDays: progress.activeDays,
    confirmedMinutes: progress.confirmedMinutes,
    content: goal.content,
    criterion: goal.criterion,
    deadline: goal.deadline,
    type: "mastery",
  };
}
