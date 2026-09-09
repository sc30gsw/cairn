import { UnstyledButton, useMantineTheme } from "@mantine/core";
import type { ScheduleEventData } from "@mantine/schedule";
import type { MouseEvent } from "react";

import { BoardScheduleEventButton } from "~/features/board/components/board-schedule-event-source";
import { boardScheduleEventColors } from "~/features/board/lib/board-schedule-color-ui";

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
        const colors = boardScheduleEventColors({ ...event, theme });
        return (
          <BoardScheduleEventButton
            buttonProps={{
              className: classes.dayAllDayEvent,
              children: event.title,
              onClick: () => onEventClick(event),
              style: { backgroundColor: colors.background, color: colors.color },
              type: "button",
            }}
            event={event}
            key={String(event.id)}
          />
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
