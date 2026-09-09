import { Badge, Paper, Stack, Text, useMantineTheme } from "@mantine/core";
import type { ScheduleEventData } from "@mantine/schedule";
import type { CSSProperties } from "react";

import {
  BoardScheduleEventBadge,
  BoardScheduleEventButton,
} from "~/features/board/components/board-schedule-event-source";
import { boardScheduleEventColors } from "~/features/board/lib/board-schedule-color-ui";
import { cn } from "~/lib/utils";

import classes from "~/features/board/components/board-schedule-all-day-expand.module.css";

export type BoardScheduleAllDayExpandAnchor = {
  dateJst: string;
  left: number;
  top: number;
  width: number;
};

type BoardScheduleAllDayExpandProps = {
  anchor: BoardScheduleAllDayExpandAnchor;
  clickableEventIds: ReadonlySet<string>;
  events: readonly ScheduleEventData[];
  onEventClick: (event: ScheduleEventData) => void;
};

export function BoardScheduleAllDayExpand({
  anchor,
  clickableEventIds,
  events,
  onEventClick,
}: BoardScheduleAllDayExpandProps) {
  const theme = useMantineTheme();
  const style: CSSProperties = {
    borderColor: "var(--mantine-color-orange-2)",
    left: anchor.left,
    position: "absolute",
    top: anchor.top,
    width: Math.max(anchor.width, 160),
    zIndex: 5,
  };

  return (
    <Paper
      aria-label={`${anchor.dateJst} の終日記録`}
      bg="var(--mantine-color-orange-0)"
      data-board-all-day-expand="true"
      p="sm"
      radius="sm"
      shadow="sm"
      style={style}
      withBorder
    >
      <Text fw={600} mb="xs" size="sm">
        {anchor.dateJst}（{events.length}件）
      </Text>
      <Stack gap={4}>
        {events.map((event) => {
          const clickable = clickableEventIds.has(String(event.id));

          if (!clickable) {
            return (
              <BoardScheduleEventBadge
                autoContrast
                c={boardScheduleEventColors({ ...event, theme }).color}
                color={event.color ?? "gray"}
                event={event}
                fullWidth
                key={String(event.id)}
                size="sm"
                variant={event.variant ?? "light"}
              >
                {event.title}
              </BoardScheduleEventBadge>
            );
          }

          return (
            <BoardScheduleEventButton
              buttonProps={{
                className: cn(
                  classes.editableItem,
                  "w-full rounded-sm px-2 py-1 text-left text-sm",
                ),
                children: (
                  <Badge
                    autoContrast
                    c={boardScheduleEventColors({ ...event, theme }).color}
                    color={event.color ?? "gray"}
                    fullWidth
                    size="sm"
                    variant={event.variant ?? "light"}
                  >
                    {event.title}
                  </Badge>
                ),
                onClick: () => {
                  onEventClick(event);
                },
                type: "button",
              }}
              event={event}
              key={String(event.id)}
            />
          );
        })}
      </Stack>
    </Paper>
  );
}
