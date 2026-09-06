import { UnstyledButton, useMantineTheme } from "@mantine/core";
import type { ScheduleEventData, ScheduleEventProps } from "@mantine/schedule";
import {
  cloneElement,
  type HTMLAttributes,
  type ReactElement,
  type ComponentPropsWithRef,
  type CSSProperties,
} from "react";

import { GoogleIcon } from "~/components/google-icon";
import { boardScheduleEventColors } from "~/features/board/lib/board-schedule-color-ui";
import { isBoardExternalEvent } from "~/features/board/lib/board-schedule-events";
import { cn } from "~/lib/utils";

import classes from "~/features/board/components/board-schedule-event-source.module.css";

type EventSourceTargetProps = Pick<
  HTMLAttributes<HTMLElement>,
  "children" | "className" | "aria-description"
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

  return cloneElement(children, {
    className: cn(children.props.className, classes.source),
    children: (
      <>
        <GoogleIcon className={classes.icon} size={14} />
        {children.props.children}
      </>
    ),
    "aria-description": "Google カレンダーの予定",
    "data-google-calendar-event": true,
  });
}

export function BoardScheduleEventButton({
  event,
  buttonProps,
}: {
  event: ScheduleEventData;
  buttonProps: ComponentPropsWithRef<"button">;
}) {
  const theme = useMantineTheme();
  const colors = boardScheduleEventColors({ ...event, theme });
  const style = { ...buttonProps.style, "--event-color": colors.color } satisfies CSSProperties &
    Record<"--event-color", string>;
  return (
    <BoardScheduleEventSource eventId={event.id}>
      <UnstyledButton {...buttonProps} style={style} />
    </BoardScheduleEventSource>
  );
}

export const renderBoardScheduleEvent: NonNullable<ScheduleEventProps["renderEvent"]> = (
  event,
  props,
) => <BoardScheduleEventButton event={event} buttonProps={props} />;
