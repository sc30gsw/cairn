import { Badge, Button, Group, Paper, Stack, Text } from "@mantine/core";
import type { ScheduleEventData } from "@mantine/schedule";
import type { CSSProperties } from "react";

export type BoardScheduleAllDayExpandAnchor = {
  dateJst: string;
  left: number;
  top: number;
  width: number;
};

type BoardScheduleAllDayExpandProps = {
  anchor: BoardScheduleAllDayExpandAnchor;
  events: readonly ScheduleEventData[];
  onClose: () => void;
};

export function BoardScheduleAllDayExpand({
  anchor,
  events,
  onClose,
}: BoardScheduleAllDayExpandProps) {
  const style: CSSProperties = {
    left: anchor.left,
    position: "absolute",
    top: anchor.top,
    width: Math.max(anchor.width, 160),
    zIndex: 5,
  };

  return (
    <Paper
      aria-label={`${anchor.dateJst} の終日記録`}
      className="border-orange-2 bg-orange-0/95 border shadow-sm"
      data-board-all-day-expand="true"
      p="sm"
      radius="sm"
      style={style}
      withBorder
    >
      <Group justify="space-between" mb="xs" wrap="nowrap">
        <Text fw={600} size="sm">
          {anchor.dateJst}（{events.length}件）
        </Text>
        <Button onClick={onClose} size="compact-xs" type="button" variant="subtle">
          閉じる
        </Button>
      </Group>
      <Stack gap={4}>
        {events.map((event) => (
          <Badge
            color={event.color ?? "gray"}
            fullWidth
            key={String(event.id)}
            size="sm"
            variant="light"
          >
            {event.title}
          </Badge>
        ))}
      </Stack>
    </Paper>
  );
}
