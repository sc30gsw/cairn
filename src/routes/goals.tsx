import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { mondayOfWeek, todayJst } from "~domain/jst";

import { OwnerGate } from "~/features/auth/components/owner-gate";
import { GoalsBoard } from "~/features/goals/components/goals-board";
import { GoalsPending } from "~/features/goals/components/goals-pending";
import {
  useCreateObstacle,
  useRemoveObstacle,
  useSaveExamGoal,
  useSaveWeeklyGoal,
  useUpdateObstacle,
} from "~/features/goals/hooks/goals-mutations";
import { useExamGoal, useObstaclesList } from "~/features/goals/hooks/goals-queries";
import { useHistoryWeek } from "~/features/history/hooks/history-queries";

export const Route = createFileRoute("/goals")({
  component: GoalsRoute,
});

function GoalsRoute() {
  return (
    <OwnerGate>
      <Suspense fallback={<GoalsPending />}>
        <GoalsReady />
      </Suspense>
    </OwnerGate>
  );
}

function GoalsReady() {
  const today = todayJst();
  const weekStart = mondayOfWeek(today);
  const { data: exam } = useExamGoal(today);
  const { data: week } = useHistoryWeek(today);
  const { data: obstacles } = useObstaclesList();
  const saveExam = useSaveExamGoal();
  const saveWeekly = useSaveWeeklyGoal();
  const createObstacle = useCreateObstacle();
  const updateObstacle = useUpdateObstacle();
  const removeObstacle = useRemoveObstacle();

  return (
    <GoalsBoard
      exam={exam}
      obstacles={obstacles}
      onCreateObstacle={(input) => {
        void createObstacle.mutateAsync(input);
      }}
      onRemoveObstacle={(planId) => {
        void removeObstacle.mutateAsync({ planId });
      }}
      onSaveExam={(input) => {
        void saveExam.mutateAsync(input);
      }}
      onSaveWeekly={(minutes) => {
        void saveWeekly.mutateAsync({ minutes, weekStartJst: weekStart });
      }}
      onUpdateObstacle={(input) => {
        void updateObstacle.mutateAsync(input);
      }}
      volumeMinutes={week.volumeMinutes}
      weekEndJst={week.weekEnd}
      todayJst={today}
      weeklyGoalMinutes={week.weeklyGoalMinutes}
    />
  );
}
