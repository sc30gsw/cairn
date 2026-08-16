import { ScrollArea } from "@mantine/core";

import { WeekAgenda } from "~/features/history/components/week-agenda";
import { useHistoryWeek } from "~/features/history/hooks/history-queries";
import { useHistoryView } from "~/features/history/hooks/use-history-view";

export function HistoryWeekTab() {
  const { today, weekAnchor } = useHistoryView();
  const { data: week } = useHistoryWeek(weekAnchor);

  return (
    <ScrollArea.Autosize mah={640} offsetScrollbars type="auto">
      <WeekAgenda todayJst={today} week={week} />
    </ScrollArea.Autosize>
  );
}
