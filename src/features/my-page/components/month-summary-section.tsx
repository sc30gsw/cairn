import { todayJst } from "~domain/jst";

import { PeriodSummarySection } from "~/features/my-page/components/period-summary-section";
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
