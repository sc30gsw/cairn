import { UnstyledButton } from "@mantine/core";
import type { ScheduleEventData } from "@mantine/schedule";
import type { MouseEvent } from "react";

import classes from "~/features/board/components/board-schedule.module.css";

type BoardScheduleDayAllDayRowProps = {
  events: readonly ScheduleEventData[];
  limit: number;
  moreLabel: (hiddenCount: number) => string;
  onMoreClick: (target: HTMLElement) => void;
};

export function BoardScheduleDayAllDayRow({
  events,
  limit,
  moreLabel,
  onMoreClick,
}: BoardScheduleDayAllDayRowProps) {
  if (events.length === 0) {
    return null;
  }

  const visible = events.slice(0, limit);
  const hiddenCount = events.length - limit;

  return (
    <div className={classes.dayAllDayRow}>
      <div className={classes.dayAllDayLabel}>終日</div>
      <div className={classes.dayAllDayEvents}>
        {visible.map((event) => (
          <UnstyledButton className={classes.dayAllDayEvent} key={String(event.id)} type="button">
            {event.title}
          </UnstyledButton>
        ))}
        {hiddenCount > 0 ? (
          <UnstyledButton
            className={classes.dayAllDayMore}
            data-board-all-day-more="true"
            onClick={(event: MouseEvent<HTMLButtonElement>) => {
              onMoreClick(event.currentTarget);
            }}
            type="button"
          >
            {moreLabel(hiddenCount)}
          </UnstyledButton>
        ) : null}
      </div>
    </div>
  );
}
