import type { ScheduleEventData } from "@mantine/schedule";
import type { DateStringValue } from "@mantine/schedule";

import { BoardScheduleYearDayPopover } from "~/features/board/components/board-schedule-year-day-popover";

type CreateBoardScheduleYearRenderDayOptions = {
  baseEvents: readonly ScheduleEventData[];
  canAdd: boolean;
  editableBlockIds: ReadonlySet<string>;
  onAdd: (dateJst: string) => void;
  onEditBlock: (event: ScheduleEventData) => void;
};

export function createBoardScheduleYearRenderDay({
  baseEvents,
  canAdd,
  editableBlockIds,
  onAdd,
  onEditBlock,
}: CreateBoardScheduleYearRenderDayOptions) {
  return function renderYearDay(date: DateStringValue, dayEvents: ScheduleEventData[]) {
    return (
      <BoardScheduleYearDayPopover
        baseEvents={baseEvents}
        canAdd={canAdd}
        dateJst={date}
        dayEvents={dayEvents}
        editableBlockIds={editableBlockIds}
        onAdd={onAdd}
        onEditBlock={onEditBlock}
      />
    );
  };
}
