import type { Goal, GoalOfType } from "~/features/goals/types/goal";

//? 試験は1件だけ。習得は複数持てる(CONTEXT.md「目標」)
export function findGoalOfType<TType extends Goal["type"]>(
  goals: readonly Goal[],
  type: TType,
): GoalOfType<TType> | undefined {
  return goals.find((goal): goal is GoalOfType<TType> => goal.type === type);
}
