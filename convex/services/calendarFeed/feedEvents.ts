import type { Doc } from "../../_generated/dataModel";
import { isActiveExamGoal } from "../../lib/examGoal";
import { compareDateJst } from "../../lib/jst";
import type { CalendarFeedEventDto } from "../../lib/validators";

export const EXAM_EVENT_PREFIX = "本番";
export const CHECKPOINT_EVENT_PREFIX = "期限";

//? 載せるのは進行中の本番の本番日と、未達成のチェックポイントの期限だけ（終日）。
//? 達成済み・終了した本番・長期目標（期限なし）・予定ブロックは載せない
export function feedEvents(goals: readonly Doc<"goals">[]): CalendarFeedEventDto[] {
  const byId = new Map(goals.map((goal) => [goal._id, goal]));
  const events: CalendarFeedEventDto[] = [];
  for (const goal of goals) {
    if (isActiveExamGoal(goal)) {
      events.push({
        dateJst: goal.examDate,
        description: `目標 ${String(goal.minScore)}〜${String(goal.maxScore)}`,
        summary: `${EXAM_EVENT_PREFIX}: ${goal.content}`,
        uid: goal._id,
      });
      continue;
    }
    if (goal.type === "mastery" && goal.deadline !== undefined && goal.achievedAt === undefined) {
      const parent = goal.parentGoalId === undefined ? undefined : byId.get(goal.parentGoalId);
      events.push({
        dateJst: goal.deadline,
        description:
          parent === undefined ? goal.criterion : `${parent.content} / ${goal.criterion}`,
        summary: `${CHECKPOINT_EVENT_PREFIX}: ${goal.content}`,
        uid: goal._id,
      });
    }
  }
  return events.toSorted(
    (left, right) =>
      compareDateJst(left.dateJst, right.dateJst) || left.uid.localeCompare(right.uid),
  );
}
