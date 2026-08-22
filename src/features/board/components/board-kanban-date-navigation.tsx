import { Group, Text } from "@mantine/core";

import { LearningDateNavigation } from "~/components/learning-date-navigation";
import { BoardDayEditLink } from "~/features/board/components/board-day-edit-link";
import { useBoardView } from "~/features/board/hooks/use-board-view";

export function BoardKanbanDateNavigation() {
  const { selectedDateJst, setDate, today } = useBoardView();

  return (
    <Group justify="center" mb="md" wrap="wrap">
      <LearningDateNavigation
        centered
        dateJst={selectedDateJst}
        linkSlot={
          <Text c="dimmed" size="sm">
            <BoardDayEditLink />
          </Text>
        }
        onDateChange={setDate}
        onGoToToday={() => setDate(today)}
        todayJst={today}
      />
    </Group>
  );
}
