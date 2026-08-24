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

//? 各セクションを独立した Suspense 境界にして、遅い集計が他のカードを塞がないようにする
//? fallback は各セクション専用の構造モック(実表示とズレる汎用 PendingComponent は使わない)
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
