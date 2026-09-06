type ExamGoalLike = { result?: unknown; type: string };

type ExamOf<TGoal> = Extract<TGoal, Record<"type", "exam">>;

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
