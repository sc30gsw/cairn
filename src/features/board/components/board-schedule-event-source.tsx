import { Tooltip, UnstyledButton } from "@mantine/core";
import type { ScheduleEventData, ScheduleEventProps } from "@mantine/schedule";
import { cloneElement, type HTMLAttributes, type ReactElement } from "react";

import { isBoardExternalEvent } from "~/features/board/lib/board-schedule-events";
import { cn } from "~/lib/utils";

import classes from "~/features/board/components/board-schedule-event-source.module.css";

type EventSourceTargetProps = Pick<
  HTMLAttributes<HTMLElement>,
  "className" | "aria-description"
> & {
  "data-google-calendar-event"?: boolean;
};

export function BoardScheduleEventSource({
  children,
  eventId,
}: {
  children: ReactElement<EventSourceTargetProps>;
  eventId: ScheduleEventData["id"];
}) {
  if (!isBoardExternalEvent(eventId)) return children;

  return (
    <Tooltip label="Google カレンダーの予定" events={{ hover: true, focus: true, touch: true }}>
      {cloneElement(children, {
        className: cn(children.props.className, classes.frame),
        "aria-description": "Google カレンダーの予定",
        "data-google-calendar-event": true,
      })}
    </Tooltip>
  );
}

export const renderBoardScheduleEvent: NonNullable<ScheduleEventProps["renderEvent"]> = (
  event,
  props,
) => (
  <BoardScheduleEventSource eventId={event.id}>
    <UnstyledButton {...props} />
  </BoardScheduleEventSource>
);
