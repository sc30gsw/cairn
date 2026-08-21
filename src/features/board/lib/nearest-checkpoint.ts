import type { BoardGoal, BoardMastery } from "~/features/board/types/board";

export function nearestCheckpoint(
  goals: readonly BoardGoal[],
  todayJst: string,
): BoardMastery | null {
  const unachieved = goals.filter(
    (goal): goal is BoardMastery =>
      goal.type === "mastery" && goal.deadline !== undefined && goal.achievedAt === undefined,
  );
  const upcoming = unachieved
    .filter((goal) => goal.deadline !== undefined && goal.deadline >= todayJst)
    .sort((left, right) => (left.deadline ?? "").localeCompare(right.deadline ?? ""));
  const overdue = unachieved
    .filter((goal) => goal.deadline !== undefined && goal.deadline < todayJst)
    .sort((left, right) => (right.deadline ?? "").localeCompare(left.deadline ?? ""));

  return upcoming[0] ?? overdue[0] ?? null;
}
