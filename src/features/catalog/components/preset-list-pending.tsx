import { Card, Grid, Group, Stack, Title } from "@mantine/core";
import { Shimmer } from "@shimmer-from-structure/react";

export function PresetListPending() {
  return (
    <Shimmer loading>
      <Stack gap="md">
        <Title order={1}>プリセット</Title>
        <Card padding="md">
          <Group grow>
            <Card h={36} padding={0} />
            <Card h={36} padding={0} />
          </Group>
        </Card>
        <Grid>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Card h={220} padding={0} />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Card h={220} padding={0} />
          </Grid.Col>
        </Grid>
      </Stack>
    </Shimmer>
  );
}
