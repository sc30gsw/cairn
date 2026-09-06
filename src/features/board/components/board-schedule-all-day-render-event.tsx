import { UnstyledButton } from "@mantine/core";
import type { ScheduleEventData } from "@mantine/schedule";
import type { ComponentPropsWithoutRef, CSSProperties } from "react";

import {
  BoardScheduleEventSource,
  renderBoardScheduleEvent,
} from "~/features/board/components/board-schedule-event-source";
import {
  mergeAllDayEventStyle,
  parseMantineAllDayRow,
} from "~/features/board/lib/board-schedule-all-day-layout";

function asStyleObject(style: CSSProperties | undefined): CSSProperties | undefined {
  if (style === undefined || typeof style !== "object" || Array.isArray(style)) {
    return undefined;
  }
  return style;
}

export const boardScheduleAllDayRenderEvent = (
  event: ScheduleEventData,
  props: ComponentPropsWithoutRef<"button"> & { style?: CSSProperties },
) => {
  const baseStyle = asStyleObject(props.style);
  const row = parseMantineAllDayRow(baseStyle?.top);
  if (row === null) {
    return renderBoardScheduleEvent(event, { ...props, children: props.children });
  }

  return (
    <BoardScheduleEventSource eventId={event.id}>
      <UnstyledButton {...props} style={mergeAllDayEventStyle(baseStyle, row)} />
    </BoardScheduleEventSource>
  );
};
