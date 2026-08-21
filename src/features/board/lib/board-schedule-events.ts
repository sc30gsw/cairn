import type { ScheduleEventData } from "@mantine/schedule";

import type { BoardMastery, BoardRow, BoardScheduleBlock } from "~/features/board/types/board";
import { RECORD_STATUS_UI } from "~/lib/record-status-ui";

export function toBoardScheduleEvents(
  dateJst: string,
  rows: readonly BoardRow[],
  checkpoint: BoardMastery | null,
  blocks: readonly BoardScheduleBlock[],
): ScheduleEventData[] {
  const recordEvents = rows.map((row) => ({
    color: RECORD_STATUS_UI[row.status].color,
    end: `${dateJst} 23:59:59`,
    id: row._id,
    start: `${dateJst} 00:00:00`,
    title: row.itemName,
  }));

  const blockEvents = blocks.map((block) => ({
    color: block.color,
    end: block.endAt,
    id: block._id,
    start: block.startAt,
    title: block.title,
  }));

  if (checkpoint?.deadline === undefined) {
    return [...recordEvents, ...blockEvents];
  }

  return [
    ...recordEvents,
    ...blockEvents,
    {
      color: "orange",
      end: `${checkpoint.deadline} 23:59:59`,
      id: checkpoint._id,
      start: `${checkpoint.deadline} 00:00:00`,
      title: checkpoint.content,
    },
  ];
}

export function boardScheduleBlockIds(blocks: readonly BoardScheduleBlock[]): ReadonlySet<string> {
  return new Set(blocks.map((block) => block._id));
}
