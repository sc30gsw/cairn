import { ScrollArea } from "@mantine/core";
import { Shimmer } from "@shimmer-from-structure/react";
import { todayJst } from "~domain/jst";

import { WeekAgenda } from "~/features/history/components/week-agenda";
import { historyShimmerWeek } from "~/features/history/lib/history-shimmer-template";

export function HistoryWeekTabPending() {
  const today = todayJst();

  return (
    <Shimmer loading>
      <ScrollArea.Autosize mah={640} offsetScrollbars type="auto">
        <WeekAgenda todayJst={today} week={historyShimmerWeek} />
      </ScrollArea.Autosize>
    </Shimmer>
  );
}
