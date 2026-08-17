import { expect, test } from "vite-plus/test";

import { groupMasteryGoals } from "~/features/goals/lib/mastery-goals";
import type { Goal, MasteryGoal } from "~/features/goals/types/goal";

function masteryGoal(
  id: string,
  fields: Pick<MasteryGoal, "achievedAt" | "deadline">,
): MasteryGoal {
  return {
    _id: id as MasteryGoal["_id"],
    activeDays: 1,
    confirmedMinutes: 30,
    content: `${id} の内容`,
    criterion: `${id} ができる`,
    type: "mastery",
    ...fields,
  };
}

const EXAM_GOAL = {
  _id: "goal-exam" as Goal["_id"],
  content: "金のフレーズを1 Unit 音読する",
  examDate: "2026-09-27",
  maxScore: 850,
  minScore: 730,
  type: "exam",
} satisfies Goal;

test("チェックポイントは期限の早い順に並ぶ", () => {
  const groups = groupMasteryGoals([
    masteryGoal("later", { achievedAt: undefined, deadline: "2026-08-30" }),
    masteryGoal("soon", { achievedAt: undefined, deadline: "2026-08-23" }),
  ]);
  expect(groups.checkpoints.map((goal) => goal._id)).toEqual(["soon", "later"]);
});

test("達成済みは達成日の新しい順に並ぶ", () => {
  const groups = groupMasteryGoals([
    masteryGoal("old", { achievedAt: "2026-08-01", deadline: undefined }),
    masteryGoal("new", { achievedAt: "2026-08-09", deadline: "2026-08-09" }),
  ]);
  expect(groups.achieved.map((goal) => goal._id)).toEqual(["new", "old"]);
});

test("期限なし・未達成だけが open に入り、3つの群は重ならない", () => {
  const checkpoint = masteryGoal("checkpoint", { achievedAt: undefined, deadline: "2026-08-23" });
  const open = masteryGoal("open", { achievedAt: undefined, deadline: undefined });
  const achieved = masteryGoal("achieved", { achievedAt: "2026-08-09", deadline: "2026-08-09" });
  const groups = groupMasteryGoals([EXAM_GOAL, checkpoint, open, achieved]);

  expect(groups.checkpoints.map((goal) => goal._id)).toEqual(["checkpoint"]);
  expect(groups.open.map((goal) => goal._id)).toEqual(["open"]);
  expect(groups.achieved.map((goal) => goal._id)).toEqual(["achieved"]);
});

test("達成した期限つき習得はチェックポイントから外れる", () => {
  const groups = groupMasteryGoals([
    masteryGoal("done", { achievedAt: "2026-08-20", deadline: "2026-08-23" }),
  ]);
  expect(groups.checkpoints).toEqual([]);
  expect(groups.achieved).toHaveLength(1);
});
