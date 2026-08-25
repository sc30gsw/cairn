import { Shimmer } from "@shimmer-from-structure/react";
import { useSuspenseQueries } from "@tanstack/react-query";
import { mondayOfWeek } from "~domain/jst";

import { TodaySummaryContent } from "~/features/my-page/components/today-summary-content";
import {
  myPageShimmerExamGoal,
  myPageShimmerTargets,
  myPageShimmerToday,
} from "~/features/my-page/lib/my-page-shimmer-template";
import type { ExamGoal } from "~/features/my-page/types/exam-goal";
import { goalsListQuery } from "~/hooks/goals-queries";
import { targetsWithProgressQuery } from "~/hooks/targets-queries";
import { useTodayJst } from "~/hooks/use-today-jst";
import { parallelConvexQuery } from "~/lib/parallel-convex-query";

export function TodaySummarySection() {
  const today = useTodayJst();
  const weekStart = mondayOfWeek(today);
  //? goals/targets を直列に待たず useSuspenseQueries で並列取得する(パフォーマンス)
  const [{ data: goals }, { data: targets }] = useSuspenseQueries({
    queries: [
      parallelConvexQuery(goalsListQuery()),
      parallelConvexQuery(targetsWithProgressQuery(weekStart)),
    ],
  });

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
