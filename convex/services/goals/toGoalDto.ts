import type { Doc } from "../../_generated/dataModel";
import type { GoalDto } from "../../lib/validators";

//* ドキュメントから ownerId / _creationTime を落として DTO にする(CVX-16: 形は validators が SSoT)。
//? 学習量の実績は保存値なので、そのまま載せるだけ(導出は書き込み側の責務 — ADR-0007)。
export function toGoalDto(goal: Doc<"goals">): GoalDto {
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
    activeDays: goal.activeDays,
    confirmedMinutes: goal.confirmedMinutes,
    content: goal.content,
    criterion: goal.criterion,
    deadline: goal.deadline,
    type: "mastery",
  };
}
