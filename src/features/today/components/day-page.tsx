import { Suspense } from "react";

import { DayBoardTab } from "~/features/today/components/day-board-tab";
import { DayPagePending } from "~/features/today/components/day-page-pending";
import { datedDayRoute, indexDayRoute } from "~/features/today/lib/day-route-api";
import { useTodayJst } from "~/hooks/use-today-jst";

/** `/` 専用 entry。`indexDayRoute` はこのコンポーネントからのみ使う。 */
export function TodayDayPage() {
  const dateJst = useTodayJst();
  const { preset } = indexDayRoute.useSearch();

  return (
    <Suspense fallback={<DayPagePending dateJst={dateJst} />}>
      <DayBoardTab key={dateJst} dateJst={dateJst} presetFromSearch={preset} />
    </Suspense>
  );
}

/** `/days/$dateJst` 専用 entry。`datedDayRoute` はこのコンポーネントからのみ使う。 */
export function DatedDayPage() {
  const { dateJst } = datedDayRoute.useParams();
  const { preset } = datedDayRoute.useSearch();

  return (
    <Suspense fallback={<DayPagePending dateJst={dateJst} />}>
      <DayBoardTab key={dateJst} dateJst={dateJst} presetFromSearch={preset} />
    </Suspense>
  );
}
