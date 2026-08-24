import { Shimmer } from "@shimmer-from-structure/react";
import { mondayOfWeek, todayJst } from "~domain/jst";

import { PeriodSummarySection } from "~/features/my-page/components/period-summary-section";
import {
  myPageShimmerActiveDays,
  myPageShimmerConfirmedMinutes,
  myPageShimmerPeriodDigest,
} from "~/features/my-page/lib/my-page-shimmer-template";
import { useWeeklyReview } from "~/hooks/review-queries";

export function WeekSummarySection() {
  const today = todayJst();
  const { data } = useWeeklyReview(mondayOfWeek(today), today);

  return (
    <PeriodSummarySection
      activeDays={data.activeDays}
      confirmedMinutes={data.confirmedMinutes}
      digest={data.digest}
      reviewTab="weekly"
      title="今週の状況"
    />
  );
}

//? WeekSummarySection 自身を fallback に入れない(再サスペンドする)。実コンポーネントにレビューと同じテンプレート値を渡すだけ
export function WeekSummarySectionFallback() {
  return (
    <Shimmer loading>
      <PeriodSummarySection
        activeDays={myPageShimmerActiveDays}
        confirmedMinutes={myPageShimmerConfirmedMinutes}
        digest={myPageShimmerPeriodDigest}
        reviewTab="weekly"
        title="今週の状況"
      />
    </Shimmer>
  );
}
