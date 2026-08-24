import { Stack } from "@mantine/core";
import { Suspense } from "react";

import { PendingComponent } from "~/components/pending-component";
import { MonthSummarySection } from "~/features/my-page/components/month-summary-section";
import { TodaySummarySection } from "~/features/my-page/components/today-summary-section";
import { WeekSummarySection } from "~/features/my-page/components/week-summary-section";

//? 各セクションを独立した Suspense 境界にして、遅い集計が他のカードを塞がないようにする
export function MyPageStatus() {
  return (
    <Stack gap="md">
      <Suspense fallback={<PendingComponent />}>
        <TodaySummarySection />
      </Suspense>
      <Suspense fallback={<PendingComponent />}>
        <WeekSummarySection />
      </Suspense>
      <Suspense fallback={<PendingComponent />}>
        <MonthSummarySection />
      </Suspense>
    </Stack>
  );
}
