import { Badge, UnstyledButton, useMantineTheme, type BadgeProps } from "@mantine/core";
import type { ScheduleEventData, ScheduleEventProps } from "@mantine/schedule";
import {
  cloneElement,
  type HTMLAttributes,
  type ReactElement,
  type ComponentPropsWithRef,
  type CSSProperties,
} from "react";

import { OverflowTooltip } from "~/components/overflow-tooltip";
import { boardScheduleEventColors } from "~/features/board/lib/board-schedule-color-ui";
import { isBoardExternalEvent } from "~/features/board/lib/board-schedule-events";

type EventSourceTargetProps = Pick<HTMLAttributes<HTMLElement>, "aria-description"> & {
  "data-google-calendar-event"?: boolean;
};

function eventSourceProps(eventId: ScheduleEventData["id"]): EventSourceTargetProps {
  return isBoardExternalEvent(eventId)
    ? { "aria-description": "Google カレンダーの予定", "data-google-calendar-event": true }
    : {};
}

export function BoardScheduleEventSource({
  children,
  eventId,
}: {
  children: ReactElement<EventSourceTargetProps>;
  eventId: ScheduleEventData["id"];
}) {
  return cloneElement(children, eventSourceProps(eventId));
}

export function BoardScheduleEventButton({
  event,
  buttonProps,
  tooltipLabel = event.title,
}: {
  event: ScheduleEventData;
  buttonProps: ComponentPropsWithRef<"button">;
  tooltipLabel?: string;
}) {
  const theme = useMantineTheme();
  const colors = boardScheduleEventColors({ ...event, theme });
  const style = { ...buttonProps.style, "--event-color": colors.color } satisfies CSSProperties &
    Record<"--event-color", string>;
  return (
    <OverflowTooltip<HTMLButtonElement> content={tooltipLabel} targetRef={buttonProps.ref}>
      {(ref) => (
        <UnstyledButton
          {...buttonProps}
          {...eventSourceProps(event.id)}
          ref={ref}
          style={style}
          title={undefined}
        />
      )}
    </OverflowTooltip>
  );
}

export function BoardScheduleEventBadge({
  children,
  event,
  ...badgeProps
}: Omit<BadgeProps, "children"> & {
  children: string;
  event: ScheduleEventData;
}) {
  return (
    <OverflowTooltip<HTMLDivElement> content={children}>
      {(ref, truncated) => (
        <Badge
          {...badgeProps}
          {...eventSourceProps(event.id)}
          ref={ref}
          tabIndex={truncated ? 0 : undefined}
        >
          {children}
        </Badge>
      )}
    </OverflowTooltip>
  );
}

export const renderBoardScheduleEvent: NonNullable<ScheduleEventProps["renderEvent"]> = (
  event,
  props,
) => <BoardScheduleEventButton event={event} buttonProps={props} />;
