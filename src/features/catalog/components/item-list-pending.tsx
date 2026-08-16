import { Card, Group, Stack, Title } from "@mantine/core";
import { Shimmer } from "@shimmer-from-structure/react";

export function ItemListPending() {
  return (
    <Shimmer loading>
      <Stack gap="md">
        <Stack gap={4}>
          <Title order={1}>項目</Title>
          <Card h={20} padding={0} w="70%" />
        </Stack>
        <Card padding="md">
          <Group grow>
            <Card h={36} padding={0} />
            <Card h={36} padding={0} />
          </Group>
        </Card>
        <Group align="flex-start" gap="md" wrap="nowrap">
          <Card h={320} miw={300} padding={0} />
          <Card h={320} miw={300} padding={0} />
          <Card h={320} miw={300} padding={0} />
        </Group>
      </Stack>
    </Shimmer>
  );
}
