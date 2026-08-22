import { Badge, Button, Group, Paper, Stack, Text } from "@mantine/core";
import type { ScheduleEventData } from "@mantine/schedule";

type BoardScheduleAllDayExpandProps = {
  dateJst: string;
  events: readonly ScheduleEventData[];
  onClose: () => void;
};

export function BoardScheduleAllDayExpand({
  dateJst,
  events,
  onClose,
}: BoardScheduleAllDayExpandProps) {
  return (
    <Paper
      aria-label={`${dateJst} の終日記録`}
      className="border-orange-2 bg-orange-0/40 border-t"
      p="sm"
      radius={0}
      withBorder
    >
      <Group justify="space-between" mb="xs">
        <Text fw={600} size="sm">
          {dateJst} の記録（{events.length}件）
        </Text>
        <Button onClick={onClose} size="compact-xs" type="button" variant="subtle">
          閉じる
        </Button>
      </Group>
      <Stack gap={6}>
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
