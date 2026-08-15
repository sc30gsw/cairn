import { convexQuery } from "@convex-dev/react-query";
import { Loader } from "@mantine/core";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { mondayOfWeek } from "~domain/jst";

import { api } from "~/../convex/_generated/api";
import { OwnerGate } from "~/features/auth/components/owner-gate";
import { GoalsBoard } from "~/features/goals/components/goals-board";
import { todayJst } from "~/lib/date-jst";
import { useConvexMutation } from "~/lib/use-convex-mutation";

export const Route = createFileRoute("/goals")({
  component: GoalsRoute,
});

function GoalsRoute() {
  return (
    <OwnerGate>
      <Suspense fallback={<Loader aria-label="読み込み中" />}>
        <GoalsReady />
      </Suspense>
    </OwnerGate>
  );
}

function GoalsReady() {
  const today = todayJst();
  const weekStart = mondayOfWeek(today);
  const { data: exam } = useSuspenseQuery(convexQuery(api.goals.getExam, { todayJst: today }));
  const { data: week } = useSuspenseQuery(convexQuery(api.history.week, { dateJst: today }));
  const { data: obstacles } = useSuspenseQuery(convexQuery(api.goals.listObstacles, {}));
  const saveExam = useConvexMutation(api.goals.saveExam);
  const saveWeekly = useConvexMutation(api.goals.saveWeekly);
  const createObstacle = useConvexMutation(api.goals.createObstacle);
  const removeObstacle = useConvexMutation(api.goals.removeObstacle);

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
      volumeMinutes={week.volumeMinutes}
      weeklyGoalMinutes={week.weeklyGoalMinutes}
    />
  );
}
