import { ActionIcon, Badge, Group, Paper, Stack, Text, UnstyledButton } from "@mantine/core";
import type { ScheduleEventData } from "@mantine/schedule";
import { IconX } from "@tabler/icons-react";
import type { CSSProperties } from "react";

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
  onClose: () => void;
  onEventClick: (event: ScheduleEventData) => void;
};

export function BoardScheduleAllDayExpand({
  anchor,
  editableBlockIds,
  events,
  onClose,
  onEventClick,
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
        <ActionIcon aria-label="閉じる" onClick={onClose} size="sm" type="button" variant="subtle">
          <IconX size={16} />
        </ActionIcon>
      </Group>
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
              className="bg-gray-1 hover:bg-gray-2 w-full rounded-sm px-2 py-1 text-left text-sm"
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
