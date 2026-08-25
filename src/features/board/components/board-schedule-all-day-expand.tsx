import { Badge, Paper, Stack, Text, UnstyledButton } from "@mantine/core";
import type { ScheduleEventData } from "@mantine/schedule";
import type { CSSProperties } from "react";

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
  editableBlockIds: ReadonlySet<string>;
  events: readonly ScheduleEventData[];
  onEventClick: (event: ScheduleEventData) => void;
};

export function BoardScheduleAllDayExpand({
  anchor,
  editableBlockIds,
  events,
  onEventClick,
}: BoardScheduleAllDayExpandProps) {
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
          const editable = editableBlockIds.has(String(event.id));

          if (!editable) {
            return (
              <Badge
                color={event.color ?? "gray"}
                fullWidth
                key={String(event.id)}
                size="sm"
                variant="light"
              >
                {event.title}
              </Badge>
            );
          }

          return (
            <UnstyledButton
              className={cn(classes.editableItem, "w-full rounded-sm px-2 py-1 text-left text-sm")}
              key={String(event.id)}
              onClick={() => {
                onEventClick(event);
              }}
              type="button"
            >
              <Badge color={event.color ?? "gray"} fullWidth size="sm" variant="light">
                {event.title}
              </Badge>
            </UnstyledButton>
          );
        })}
      </Stack>
    </Paper>
  );
}
