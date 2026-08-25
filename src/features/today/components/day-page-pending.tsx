import { Shimmer } from "@shimmer-from-structure/react";
import type { DateJst } from "~domain/jst";

import { DayBoard } from "~/features/today/components/day-board";
import {
  dayBoardShimmerDay,
  dayBoardShimmerItems,
  dayBoardShimmerPresets,
} from "~/features/today/lib/day-board-shimmer-template";
import { useTodayJst } from "~/hooks/use-today-jst";

export function DayPagePending({ dateJst }: Record<"dateJst", DateJst>) {
  const today = useTodayJst();

  return (
    <Shimmer loading>
      <DayBoard
        dateJst={dateJst}
        day={dayBoardShimmerDay(dateJst)}
        interactive={false}
        items={dayBoardShimmerItems}
        presets={dayBoardShimmerPresets}
        todayJst={today}
      />
    </Shimmer>
  );
}
