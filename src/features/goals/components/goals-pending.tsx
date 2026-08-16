import { Card, Grid, Stack, Title } from "@mantine/core";
import { Shimmer } from "@shimmer-from-structure/react";

export function GoalsPending() {
  return (
    <Shimmer loading>
      <Stack gap="md">
        <Title order={1}>目標</Title>
        <Grid>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Card h={180} padding={0} />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Card h={180} padding={0} />
          </Grid.Col>
          <Grid.Col span={12}>
            <Card h={240} padding={0} />
          </Grid.Col>
        </Grid>
      </Stack>
    </Shimmer>
  );
}
