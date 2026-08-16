import { ScrollArea } from "@mantine/core";

import { WeekAgenda } from "~/features/history/components/week-agenda";
import { useHistoryWeek } from "~/features/history/hooks/history-queries";

type HistoryWeekTabProps = {
  today: string;
  weekAnchor: string;
};

export function HistoryWeekTab({ today, weekAnchor }: HistoryWeekTabProps) {
  const { data: week } = useHistoryWeek(weekAnchor);

  return (
    <ScrollArea.Autosize mah={640} offsetScrollbars type="auto">
      <WeekAgenda todayJst={today} week={week} />
    </ScrollArea.Autosize>
  );
}
