import { Card, Grid, Group, Stack, Title } from "@mantine/core";
import { Shimmer } from "@shimmer-from-structure/react";

export function DayPagePending() {
  return (
    <Shimmer loading>
      <Stack gap="md">
        <Group justify="space-between">
          <Title order={1}>学習記録</Title>
          <Card h={36} padding={0} w={160} />
        </Group>
        <Grid>
          <Grid.Col span={{ base: 12, lg: 8 }}>
            <Stack gap="sm">
              <Card h={72} padding={0} />
              <Card h={72} padding={0} />
              <Card h={72} padding={0} />
            </Stack>
          </Grid.Col>
          <Grid.Col span={{ base: 12, lg: 4 }}>
            <Card h={240} padding={0} />
          </Grid.Col>
        </Grid>
      </Stack>
    </Shimmer>
  );
}
