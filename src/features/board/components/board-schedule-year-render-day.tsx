import type { ScheduleEventData } from "@mantine/schedule";
import type { DateStringValue } from "@mantine/schedule";

import { BoardScheduleYearDayPopover } from "~/features/board/components/board-schedule-year-day-popover";

type CreateBoardScheduleYearRenderDayOptions = {
  baseEvents: readonly ScheduleEventData[];
  canAdd: boolean;
  clickableEventIds: ReadonlySet<string>;
  openedDate: DateStringValue | null;
  popoverId: string;
  onClose: () => void;
  onAdd: (dateJst: string) => void;
  onEditBlock: (event: ScheduleEventData) => void;
};

export function createBoardScheduleYearRenderDay({
  baseEvents,
  canAdd,
  clickableEventIds,
  openedDate,
  popoverId,
  onClose,
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
        clickableEventIds={clickableEventIds}
        selected={openedDate === date}
        popoverId={`${popoverId}-${date}`}
        onClose={onClose}
        onAdd={onAdd}
        onEditBlock={onEditBlock}
      />
    );
  };
}
