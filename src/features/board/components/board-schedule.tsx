import { Card } from "@mantine/core";
import { Schedule } from "@mantine/schedule";
import type { DateJst } from "~domain/jst";

import { toBoardScheduleEvents } from "~/features/board/lib/board-schedule-events";
import type { BoardMastery, BoardRow } from "~/features/board/types/board";
import { SCHEDULE_LABELS_JA } from "~/lib/schedule-labels";

type BoardScheduleProps = {
  checkpoint: BoardMastery | null;
  dateJst: DateJst;
  rows: readonly BoardRow[];
};

export function BoardSchedule({ checkpoint, dateJst, rows }: BoardScheduleProps) {
  return (
    <Card padding="md">
      <Schedule
        date={dateJst}
        defaultView="week"
        events={toBoardScheduleEvents(dateJst, rows, checkpoint)}
        labels={SCHEDULE_LABELS_JA}
        locale="ja"
        mode="static"
        monthViewProps={{ firstDayOfWeek: 1 }}
        weekViewProps={{ firstDayOfWeek: 1 }}
      />
    </Card>
  );
}
