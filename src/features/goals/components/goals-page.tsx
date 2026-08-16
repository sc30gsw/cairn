import { Suspense } from "react";
import { mondayOfWeek, todayJst } from "~domain/jst";

import { GoalsBoard } from "~/features/goals/components/goals-board";
import { GoalsPending } from "~/features/goals/components/goals-pending";
import {
  useCreateObstacle,
  useRemoveObstacle,
  useSaveExamGoal,
  useSaveWeeklyGoal,
  useUpdateObstacle,
} from "~/features/goals/hooks/goals-mutations";
import {
  useExamGoal,
  useObstaclesList,
  useWeeklyTrend,
} from "~/features/goals/hooks/goals-queries";
import { useHistoryWeek } from "~/features/history/hooks/history-queries";
import { runMutation } from "~/lib/run-mutation";

export function GoalsPage() {
  return (
    <Suspense fallback={<GoalsPending />}>
      <GoalsReady />
    </Suspense>
  );
}

function GoalsReady() {
  const today = todayJst();
  const weekStart = mondayOfWeek(today);
  const { data: exam } = useExamGoal(today);
  const { data: week } = useHistoryWeek(today);
  const { data: obstacles } = useObstaclesList();
  const { data: trendWeeks } = useWeeklyTrend(today);
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
        void runMutation(() => createObstacle.mutateAsync(input), {
          successMessage: "障害プランを追加しました",
        });
      }}
      onRemoveObstacle={(planId) => {
        void runMutation(() => removeObstacle.mutateAsync({ planId }), {
          successMessage: "障害プランを削除しました",
        });
      }}
      onSaveExam={(input) => {
        void runMutation(() => saveExam.mutateAsync(input), {
          successMessage: "本番目標を保存しました",
        });
      }}
      onSaveWeekly={(minutes) => {
        void runMutation(() => saveWeekly.mutateAsync({ minutes, weekStartJst: weekStart }), {
          successMessage: "週間ゴールを保存しました",
        });
      }}
      onUpdateObstacle={(input) => {
        void runMutation(() => updateObstacle.mutateAsync(input), {
          successMessage: "障害プランを更新しました",
        });
      }}
      todayJst={today}
      trendWeeks={trendWeeks}
      volumeMinutes={week.volumeMinutes}
      weekEndJst={week.weekEnd}
      weeklyGoalMinutes={week.weeklyGoalMinutes}
    />
  );
}
