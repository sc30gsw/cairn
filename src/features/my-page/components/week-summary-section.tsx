import { mondayOfWeek, todayJst } from "~domain/jst";

import { PeriodSummarySection } from "~/features/my-page/components/period-summary-section";
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
