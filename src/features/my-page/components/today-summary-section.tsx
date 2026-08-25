import { convexQuery } from "@convex-dev/react-query";
import { Shimmer } from "@shimmer-from-structure/react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { mondayOfWeek } from "~domain/jst";

import { api } from "~/../convex/_generated/api";
import { TodaySummaryContent } from "~/features/my-page/components/today-summary-content";
import {
  myPageShimmerExamGoal,
  myPageShimmerTargets,
  myPageShimmerToday,
} from "~/features/my-page/lib/my-page-shimmer-template";
import type { ExamGoal } from "~/features/my-page/types/exam-goal";
import { useTodayJst } from "~/hooks/use-today-jst";

export function TodaySummarySection() {
  const today = useTodayJst();
  const weekStart = mondayOfWeek(today);
  const { data: goals } = useSuspenseQuery(convexQuery(api.queries.goals.list.list, {}));
  const { data: targets } = useSuspenseQuery(
    convexQuery(api.queries.targets.listWithProgress.listWithProgress, { weekStartJst: weekStart }),
  );

  const examGoal = goals.find((goal): goal is ExamGoal => goal.type === "exam");

  return <TodaySummaryContent examGoal={examGoal} targets={targets} today={today} />;
}

//? TodaySummarySection 自身を fallback に入れない(再サスペンドする)。実コンポーネントにテンプレート値を渡すだけ
export function TodaySummarySectionFallback() {
  return (
    <Shimmer loading>
      <TodaySummaryContent
        examGoal={myPageShimmerExamGoal}
        targets={myPageShimmerTargets}
        today={myPageShimmerToday}
      />
    </Shimmer>
  );
}
