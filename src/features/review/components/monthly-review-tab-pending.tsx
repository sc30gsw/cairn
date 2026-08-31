import { Group, Stack, Text } from "@mantine/core";
import { Shimmer } from "@shimmer-from-structure/react";

import { MonthlyCategoryComparison } from "~/features/review/components/monthly-category-comparison";
import { MonthlyDigestTrendChart } from "~/features/review/components/monthly-digest-trend-chart";
import { MonthlyReviewSummaryCards } from "~/features/review/components/monthly-review-summary-cards";
import { yearMonthLabel } from "~/features/review/lib/monthly-review-labels";
import { reviewShimmerMonthly } from "~/features/review/lib/review-shimmer-template";
import { NUMERAL_FONT } from "~/lib/theme";

export function MonthlyReviewTabPending() {
  return (
    <Shimmer loading>
      <Stack gap="lg">
        <Group align="center" gap="xs" wrap="nowrap">
          <Text ff={NUMERAL_FONT} fw={500}>
            {yearMonthLabel(reviewShimmerMonthly.yearMonth)}
          </Text>
        </Group>
        <MonthlyReviewSummaryCards
          activeDays={reviewShimmerMonthly.activeDays}
          confirmedMinutes={reviewShimmerMonthly.confirmedMinutes}
          digest={reviewShimmerMonthly.digest}
          elapsedDays={reviewShimmerMonthly.elapsedDays}
          previousActiveDays={reviewShimmerMonthly.previousActiveDays}
          previousConfirmedMinutes={reviewShimmerMonthly.previousConfirmedMinutes}
        />
        <MonthlyDigestTrendChart digestTrend={reviewShimmerMonthly.digestTrend} />
        <MonthlyCategoryComparison
          byCategory={reviewShimmerMonthly.byCategory}
          previousByCategory={reviewShimmerMonthly.previousByCategory}
          previousYearMonth={reviewShimmerMonthly.previousYearMonth}
        />
      </Stack>
    </Shimmer>
  );
}
