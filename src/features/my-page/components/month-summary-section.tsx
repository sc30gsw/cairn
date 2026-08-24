import { Shimmer } from "@shimmer-from-structure/react";
import { todayJst } from "~domain/jst";

import { PeriodSummarySection } from "~/features/my-page/components/period-summary-section";
import {
  myPageShimmerActiveDays,
  myPageShimmerConfirmedMinutes,
  myPageShimmerPeriodDigest,
} from "~/features/my-page/lib/my-page-shimmer-template";
import { useMonthlyReview } from "~/hooks/review-queries";

export function MonthSummarySection() {
  const today = todayJst();
  const { data } = useMonthlyReview(today.slice(0, 7), today);

  return (
    <PeriodSummarySection
      activeDays={data.activeDays}
      confirmedMinutes={data.confirmedMinutes}
      digest={data.digest}
      reviewTab="monthly"
      title="今月の状況"
    />
  );
}

//? MonthSummarySection 自身を fallback に入れない(再サスペンドする)。実コンポーネントにテンプレート値を渡すだけ
export function MonthSummarySectionFallback() {
  return (
    <Shimmer loading>
      <PeriodSummarySection
        activeDays={myPageShimmerActiveDays}
        confirmedMinutes={myPageShimmerConfirmedMinutes}
        digest={myPageShimmerPeriodDigest}
        reviewTab="monthly"
        title="今月の状況"
      />
    </Shimmer>
  );
}
