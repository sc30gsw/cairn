import { Card, Stack, Title } from "@mantine/core";
import type { DateJst } from "~domain/jst";

import { PlanClock } from "~/features/plan/components/plan-clock";
import type { PlanEventDto } from "~/features/plan/types/plan";

type PlanClockCardProps = {
  events: readonly PlanEventDto[];
  selectedDateJst: DateJst;
  todayJst: DateJst;
  unplannedConfirmedMinutes: number;
};

export function PlanClockCard({
  events,
  selectedDateJst,
  todayJst,
  unplannedConfirmedMinutes,
}: PlanClockCardProps) {
  return (
    <Card padding="md" withBorder>
      <Stack gap="md">
        <Title order={2}>一日の時計</Title>
        <PlanClock
          events={events}
          selectedDateJst={selectedDateJst}
          todayJst={todayJst}
          unplannedConfirmedMinutes={unplannedConfirmedMinutes}
        />
      </Stack>
    </Card>
  );
}
