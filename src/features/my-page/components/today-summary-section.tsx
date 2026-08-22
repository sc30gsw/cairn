import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { mondayOfWeek, todayJst } from "~domain/jst";

import { api } from "~/../convex/_generated/api";
import { TodaySummaryContent } from "~/features/my-page/components/today-summary-content";
import type { ExamGoal } from "~/features/my-page/types/exam-goal";

export function TodaySummarySection() {
  const today = todayJst();
  const weekStart = mondayOfWeek(today);
  const { data: goals } = useSuspenseQuery(convexQuery(api.queries.goals.list.list, {}));
  const { data: targets } = useSuspenseQuery(
    convexQuery(api.queries.targets.listWithProgress.listWithProgress, { weekStartJst: weekStart }),
  );

  const examGoal = goals.find((goal): goal is ExamGoal => goal.type === "exam");

  return <TodaySummaryContent examGoal={examGoal} targets={targets} today={today} />;
}
