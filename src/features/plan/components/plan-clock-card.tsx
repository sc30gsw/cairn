import { Card, Stack, Title } from "@mantine/core";
import type { ComponentProps } from "react";

import { PlanClock } from "~/features/plan/components/plan-clock";

type PlanClockCardProps = ComponentProps<typeof PlanClock>;

export function PlanClockCard(props: PlanClockCardProps) {
  return (
    <Card>
      <Stack gap="md">
        <Title order={2}>一日の時計</Title>
        <PlanClock {...props} />
      </Stack>
    </Card>
  );
}
