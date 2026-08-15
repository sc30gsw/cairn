import { Button, Group, Stack, Text, Title } from "@mantine/core";
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
    <Stack gap="md">
      <Title order={1}>ゴミ箱</Title>
      <Title order={2}>日</Title>
      {trash.days.length === 0 ? <Text c="dimmed">ゴミ箱の日はありません。</Text> : null}
      {trash.days.map((day) => (
        <Group key={day._id} justify="space-between">
          <Text>{day.dateJst}</Text>
          <Button onClick={() => onRestoreDay(day._id)}>この日を戻す</Button>
        </Group>
      ))}
      <Title order={2}>行</Title>
      {trash.rows.length === 0 ? <Text c="dimmed">ゴミ箱の行はありません。</Text> : null}
      {trash.rows.map((row) => (
        <Group key={row._id} justify="space-between">
          <Text>
            {row.dateJst} {row.itemName}
          </Text>
          <Button onClick={() => onRestoreRow(row._id)}>この行を戻す</Button>
        </Group>
      ))}
    </Stack>
  );
}
