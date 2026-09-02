import { Shimmer } from "@shimmer-from-structure/react";
import { useSuspenseQueries } from "@tanstack/react-query";
import { findActiveExamGoal } from "~domain/examGoal";
import { mondayOfWeek } from "~domain/jst";

import { TodaySummaryContent } from "~/features/my-page/components/today-summary-content";
import {
  myPageShimmerExamGoal,
  myPageShimmerTargets,
  myPageShimmerToday,
} from "~/features/my-page/lib/my-page-shimmer-template";
import { goalsListQuery } from "~/hooks/goals-queries";
import { targetsWithProgressQuery } from "~/hooks/targets-queries";
import { useTodayJst } from "~/hooks/use-today-jst";
import { parallelConvexQuery } from "~/lib/parallel-convex-query";

export function TodaySummarySection() {
  const today = useTodayJst();
  const weekStart = mondayOfWeek(today);
  const [{ data: goals }, { data: targets }] = useSuspenseQueries({
    queries: [
      parallelConvexQuery(goalsListQuery()),
      parallelConvexQuery(targetsWithProgressQuery(weekStart)),
    ],
  });

  //? 終了した（結果が入った）本番は数えない。進行中の本番だけがカウントダウンの軸
  const examGoal = findActiveExamGoal(goals);

  return <TodaySummaryContent examGoal={examGoal} targets={targets} today={today} />;
}

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
