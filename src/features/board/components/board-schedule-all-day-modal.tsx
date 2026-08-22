import { Modal, Stack, Text } from "@mantine/core";
import type { ScheduleEventData } from "@mantine/schedule";

type BoardScheduleAllDayModalProps = {
  dateJst: string | null;
  events: readonly ScheduleEventData[];
  onClose: () => void;
  opened: boolean;
};

export function BoardScheduleAllDayModal({
  dateJst,
  events,
  onClose,
  opened,
}: BoardScheduleAllDayModalProps) {
  return (
    <Modal
      onClose={onClose}
      opened={opened}
      title={dateJst === null ? "終日の記録" : `${dateJst} の記録`}
    >
      <Stack gap="sm">
        {events.map((event) => (
          <Text key={String(event.id)} size="sm">
            {event.title}
          </Text>
        ))}
      </Stack>
    </Modal>
  );
}
