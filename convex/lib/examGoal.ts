type ExamGoalLike = { result?: unknown; type: string };

type ExamOf<TGoal> = Extract<TGoal, Record<"type", "exam">>;

//? 本番目標は「結果が入っているか」だけで進行中 / 終了を分ける。目標タイプは増やさない（ADR-0005 / ADR-0015）
export function isActiveExamGoal<TGoal extends ExamGoalLike>(goal: TGoal): goal is ExamOf<TGoal> {
  return goal.type === "exam" && goal.result === undefined;
}

export function isFinishedExamGoal<TGoal extends ExamGoalLike>(goal: TGoal): goal is ExamOf<TGoal> {
  return goal.type === "exam" && goal.result !== undefined;
}

export function findActiveExamGoal<TGoal extends ExamGoalLike>(
  goals: readonly TGoal[],
): ExamOf<TGoal> | undefined {
  return goals.find((goal): goal is ExamOf<TGoal> => isActiveExamGoal(goal));
}
