import { Card, Grid, Stack, Title } from "@mantine/core";
import { Shimmer } from "@shimmer-from-structure/react";

export function TrashPending() {
  return (
    <Shimmer loading>
      <Stack gap="md">
        <Title order={1}>ゴミ箱</Title>
        <Grid>
          <Grid.Col span={12}>
            <Card h={160} padding={0} />
          </Grid.Col>
          <Grid.Col span={12}>
            <Card h={280} padding={0} />
          </Grid.Col>
        </Grid>
      </Stack>
    </Shimmer>
  );
}
