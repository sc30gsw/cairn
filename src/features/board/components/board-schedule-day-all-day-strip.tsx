import { UnstyledButton } from "@mantine/core";
import type { ScheduleEventData } from "@mantine/schedule";
import type { MouseEvent } from "react";

import classes from "~/features/board/components/board-schedule.module.css";

type BoardScheduleDayAllDayStripProps = {
  events: readonly ScheduleEventData[];
  limit: number;
  moreLabel: (hiddenCount: number) => string;
  onEventClick: (event: ScheduleEventData) => void;
  onMoreClick: (target: HTMLElement) => void;
};

export function BoardScheduleDayAllDayStrip({
  events,
  limit,
  moreLabel,
  onEventClick,
  onMoreClick,
}: BoardScheduleDayAllDayStripProps) {
  const visible = events.slice(0, limit);
  const hiddenCount = events.length - limit;

  return (
    <>
      {visible.map((event) => (
        <UnstyledButton
          className={classes.dayAllDayEvent}
          key={String(event.id)}
          onClick={() => {
            onEventClick(event);
          }}
          type="button"
        >
          {event.title}
        </UnstyledButton>
      ))}
      {hiddenCount > 0 ? (
        <UnstyledButton
          className={classes.dayAllDayMore}
          data-board-all-day-more="true"
          onClick={(event: MouseEvent<HTMLButtonElement>) => {
            event.stopPropagation();
            onMoreClick(event.currentTarget);
          }}
          type="button"
        >
          {moreLabel(hiddenCount)}
        </UnstyledButton>
      ) : null}
    </>
  );
}
