import { UnstyledButton, useMantineTheme } from "@mantine/core";
import type { ScheduleEventData } from "@mantine/schedule";
import type { MouseEvent } from "react";

import { BoardScheduleEventSource } from "~/features/board/components/board-schedule-event-source";

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
  const theme = useMantineTheme();
  const visible = events.slice(0, limit);
  const hiddenCount = events.length - limit;

  return (
    <>
      {visible.map((event) => {
        const colors = theme.variantColorResolver({
          color: event.color ?? "gray",
          theme,
          variant: event.variant ?? "light",
          autoContrast: true,
        });
        return (
          <BoardScheduleEventSource eventId={event.id} key={String(event.id)}>
            <UnstyledButton
              className={classes.dayAllDayEvent}
              style={{ backgroundColor: colors.background, color: colors.color }}
              onClick={() => onEventClick(event)}
              type="button"
            >
              {event.title}
            </UnstyledButton>
          </BoardScheduleEventSource>
        );
      })}
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
