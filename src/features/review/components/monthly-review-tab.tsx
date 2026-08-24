import { Anchor, Stack } from "@mantine/core";
import { Link } from "@tanstack/react-router";

import { MonthlyCategoryComparison } from "~/features/review/components/monthly-category-comparison";
import { MonthlyDigestTrendChart } from "~/features/review/components/monthly-digest-trend-chart";
import { MonthlyReviewMonthNav } from "~/features/review/components/monthly-review-month-nav";
import { MonthlyReviewSummaryCards } from "~/features/review/components/monthly-review-summary-cards";
import { useMonthlyReview } from "~/features/review/hooks/review-queries";
import { useReviewView } from "~/features/review/hooks/use-review-view";
import {
  historyMonthAnalysisLink,
  yearMonthLabel,
} from "~/features/review/lib/monthly-review-labels";

export function MonthlyReviewTab() {
  const { setMonth, today, yearMonth } = useReviewView();
  const { data: review } = useMonthlyReview(yearMonth, today);

  return (
    <Stack gap="lg">
      <MonthlyReviewMonthNav
        currentYearMonth={today.slice(0, 7)}
        onMonthChange={setMonth}
        yearMonth={yearMonth}
      />

      <MonthlyReviewSummaryCards
        activeDays={review.activeDays}
        confirmedMinutes={review.confirmedMinutes}
        digest={review.digest}
        elapsedDays={review.elapsedDays}
        previousActiveDays={review.previousActiveDays}
        previousConfirmedMinutes={review.previousConfirmedMinutes}
      />

      <MonthlyDigestTrendChart digestTrend={review.digestTrend} />

      <MonthlyCategoryComparison
        byCategory={review.byCategory}
        previousByCategory={review.previousByCategory}
        previousYearMonth={review.previousYearMonth}
      />

      <Anchor
        renderRoot={(props) => <Link {...props} {...historyMonthAnalysisLink(yearMonth)} />}
        underline="hover"
      >
        {yearMonthLabel(yearMonth)}を履歴で掘る
      </Anchor>
    </Stack>
  );
}
