import type { ExamGoal, Obstacle } from "~/features/goals/types/goal";

export const goalsShimmerExam = {
  daysRemaining: 43,
  examDate: "2026-09-27",
  maxScore: 850,
  minScore: 730,
} satisfies ExamGoal;

export const goalsShimmerObstacles = [
  { _id: "shimmer-obstacle" as Obstacle["_id"], ifText: "眠い", thenText: "金フレだけ" },
] satisfies Obstacle[];

export const goalsShimmerTodayJst = "2026-08-17";
export const goalsShimmerWeekEndJst = "2026-08-23";
export const goalsShimmerWeeklyGoalMinutes = 300;
export const goalsShimmerVolumeMinutes = 30;
