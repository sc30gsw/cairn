import type { ScheduleEventData } from "@mantine/schedule";

import type { BoardMastery, BoardRow } from "~/features/board/types/board";
import { RECORD_STATUS_UI } from "~/lib/record-status-ui";

export function toBoardScheduleEvents(
  dateJst: string,
  rows: readonly BoardRow[],
  checkpoint: BoardMastery | null,
): ScheduleEventData[] {
  const recordEvents = rows.map((row) => ({
    color: RECORD_STATUS_UI[row.status].color,
    end: `${dateJst} 23:59:59`,
    id: row._id,
    start: `${dateJst} 00:00:00`,
    title: row.itemName,
  }));

  if (checkpoint?.deadline === undefined) {
    return recordEvents;
  }

  return [
    ...recordEvents,
    {
      color: "orange",
      end: `${checkpoint.deadline} 23:59:59`,
      id: checkpoint._id,
      start: `${checkpoint.deadline} 00:00:00`,
      title: checkpoint.content,
    },
  ];
}
