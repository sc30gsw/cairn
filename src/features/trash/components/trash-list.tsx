import { Button, Card, Grid, Stack, Text, Title } from "@mantine/core";
import type { FunctionReturnType } from "convex/server";

import type { api } from "~/../convex/_generated/api";

type TrashPage = FunctionReturnType<typeof api.trash.list>;

type TrashListProps = {
  onRestoreDay: (dayId: TrashPage["days"][number]["_id"]) => void;
  onRestoreRow: (rowId: TrashPage["rows"][number]["_id"]) => void;
  trash: TrashPage;
};

export function TrashList({ onRestoreDay, onRestoreRow, trash }: TrashListProps) {
  return (
    <Grid gap="md">
      <Grid.Col span={12}>
        <Title order={1}>ゴミ箱</Title>
      </Grid.Col>
      <Grid.Col span={{ base: 12, md: 6 }}>
        <Card h="100%" padding="lg" withBorder>
          <Stack gap="md">
            <Title order={2}>日</Title>
            {trash.days.length === 0 ? <Text c="dimmed">ゴミ箱の日はありません。</Text> : null}
            {trash.days.map((day) => (
              <Grid key={day._id} align="center" gap="sm">
                <Grid.Col span="auto">
                  <Text>{day.dateJst}</Text>
                </Grid.Col>
                <Grid.Col span="content">
                  <Button onClick={() => onRestoreDay(day._id)}>この日を戻す</Button>
                </Grid.Col>
              </Grid>
            ))}
          </Stack>
        </Card>
      </Grid.Col>
      <Grid.Col span={{ base: 12, md: 6 }}>
        <Card h="100%" padding="lg" withBorder>
          <Stack gap="md">
            <Title order={2}>行</Title>
            {trash.rows.length === 0 ? <Text c="dimmed">ゴミ箱の行はありません。</Text> : null}
            {trash.rows.map((row) => (
              <Grid key={row._id} align="center" gap="sm">
                <Grid.Col span="auto">
                  <Text>
                    {row.dateJst} {row.itemName}
                  </Text>
                </Grid.Col>
                <Grid.Col span="content">
                  <Button onClick={() => onRestoreRow(row._id)}>この行を戻す</Button>
                </Grid.Col>
              </Grid>
            ))}
          </Stack>
        </Card>
      </Grid.Col>
    </Grid>
  );
}
