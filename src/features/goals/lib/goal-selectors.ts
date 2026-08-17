import type { Goal, GoalOfType } from "~/features/goals/types/goal";

//? 試験とペースは1件だけ。残りは複数持てる(CONTEXT.md 目標)
export function findGoalOfType<TType extends Goal["type"]>(
  goals: readonly Goal[],
  type: TType,
): GoalOfType<TType> | undefined {
  return goals.find((goal): goal is GoalOfType<TType> => goal.type === type);
}

export function filterGoalsOfType<TType extends Goal["type"]>(
  goals: readonly Goal[],
  type: TType,
): GoalOfType<TType>[] {
  return goals.filter((goal): goal is GoalOfType<TType> => goal.type === type);
}
