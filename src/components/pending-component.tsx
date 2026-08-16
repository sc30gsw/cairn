import { Card, Group, Stack, Title } from "@mantine/core";
import { Shimmer } from "@shimmer-from-structure/react";

export function PendingComponent() {
  return (
    <Shimmer loading>
      <Stack gap="md" m="md">
        <Title order={1}>読み込み中</Title>
        <Card padding="md">
          <Stack gap="sm">
            <Group grow>
              <Card h={36} padding={0} />
              <Card h={36} padding={0} />
            </Group>
            <Card h={120} padding={0} />
            <Card h={120} padding={0} />
          </Stack>
        </Card>
      </Stack>
    </Shimmer>
  );
}
