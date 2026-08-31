import { Stack } from "@mantine/core";
import { Suspense } from "react";

import {
  MonthSummarySection,
  MonthSummarySectionFallback,
} from "~/features/my-page/components/month-summary-section";
import {
  TodaySummarySection,
  TodaySummarySectionFallback,
} from "~/features/my-page/components/today-summary-section";
import {
  WeekSummarySection,
  WeekSummarySectionFallback,
} from "~/features/my-page/components/week-summary-section";

export function MyPageStatus() {
  return (
    <Stack gap="md">
      <Suspense fallback={<TodaySummarySectionFallback />}>
        <TodaySummarySection />
      </Suspense>
      <Suspense fallback={<WeekSummarySectionFallback />}>
        <WeekSummarySection />
      </Suspense>
      <Suspense fallback={<MonthSummarySectionFallback />}>
        <MonthSummarySection />
      </Suspense>
    </Stack>
  );
}
