import { compareDateJst } from "~domain/jst";

import type { Goal, MasteryGoal } from "~/features/goals/types/goal";

export type MasteryGroups = {
  //? 達成の履歴。達成しても目標は消えない(CONTEXT.md「習得」)
  achieved: MasteryGoal[];
  //? 期限つき・未達成の習得 = チェックポイント。本番目標の下に期限順で並ぶ(docs/adr/0006)
  checkpoints: MasteryGoal[];
  //? 期限なし・未達成の習得。締切のない到達基準
  open: MasteryGoal[];
};

function isCheckpoint(goal: MasteryGoal): boolean {
  return goal.deadline !== undefined && goal.achievedAt === undefined;
}

//* 習得を「チェックポイント / 期限なし / 達成済み」に仕分ける。重なりのない3分割(CVX-09: 純関数)。
export function groupMasteryGoals(goals: readonly Goal[]): MasteryGroups {
  const masteryGoals = goals.filter((goal): goal is MasteryGoal => goal.type === "mastery");

  return {
    achieved: masteryGoals
      .filter((goal) => goal.achievedAt !== undefined)
      .sort((left, right) => compareDateJst(right.achievedAt ?? "", left.achievedAt ?? "")),
    checkpoints: masteryGoals
      .filter(isCheckpoint)
      .sort((left, right) => compareDateJst(left.deadline ?? "", right.deadline ?? "")),
    open: masteryGoals.filter(
      (goal) => goal.deadline === undefined && goal.achievedAt === undefined,
    ),
  };
}
