import { UnstyledButton } from "@mantine/core";
import type { ScheduleEventData } from "@mantine/schedule";
import type { ComponentPropsWithoutRef, CSSProperties } from "react";

import { BoardScheduleDayAllDayStrip } from "~/features/board/components/board-schedule-day-all-day-strip";
import {
  isBoardAllDayEvent,
  isBoardAllDayMoreEvent,
} from "~/features/board/lib/board-schedule-events";

import classes from "~/features/board/components/board-schedule.module.css";

function asStyleObject(style: CSSProperties | undefined): CSSProperties | undefined {
  if (style === undefined || typeof style !== "object" || Array.isArray(style)) {
    return undefined;
  }
  return style;
}

type CreateBoardScheduleDayAllDayRenderEventInput = {
  allDayEvents: readonly ScheduleEventData[];
  limit: number;
  moreLabel: (hiddenCount: number) => string;
  onMoreClick: (target: HTMLElement) => void;
};

export function createBoardScheduleDayAllDayRenderEvent({
  allDayEvents,
  limit,
  moreLabel,
  onMoreClick,
}: CreateBoardScheduleDayAllDayRenderEventInput) {
  const firstAllDayId = allDayEvents[0]?.id;

  return (
    event: ScheduleEventData,
    props: ComponentPropsWithoutRef<"button"> & { style?: CSSProperties },
  ) => {
    if (!isBoardAllDayEvent(event)) {
      return <UnstyledButton {...props} />;
    }

    if (isBoardAllDayMoreEvent(event.id) || event.id !== firstAllDayId) {
      return (
        <UnstyledButton
          {...props}
          aria-hidden
          style={{ ...asStyleObject(props.style), display: "none" }}
          tabIndex={-1}
        >
          {props.children}
        </UnstyledButton>
      );
    }

    const baseStyle = asStyleObject(props.style);

    return (
      <UnstyledButton
        {...props}
        className={classes.dayAllDayComposite}
        style={{
          ...baseStyle,
          flex: "1 1 100%",
          height: "100%",
          insetBlock: "1px",
          insetInlineEnd: "1px",
          insetInlineStart: "1px",
          maxHeight: "none",
          position: "absolute",
          width: "auto",
        }}
      >
        <div className={classes.dayAllDayEvents}>
          <BoardScheduleDayAllDayStrip
            events={allDayEvents}
            limit={limit}
            moreLabel={moreLabel}
            onMoreClick={onMoreClick}
          />
        </div>
      </UnstyledButton>
    );
  };
}
