import { Button, Card, Grid, Group, Modal, Stack, Text, Title } from "@mantine/core";
import { useState } from "react";

import { trashStatusLabel } from "~/lib/record-status-ui";
import type { TrashDay, TrashPage, TrashRow } from "~/features/trash/types/trash";

type TrashListProps = {
  onPurgeDay: (dayId: TrashDay["_id"]) => void;
  onPurgeRow: (rowId: TrashRow["_id"]) => void;
  onRestoreDay: (dayId: TrashDay["_id"]) => void;
  onRestoreRow: (rowId: TrashRow["_id"]) => void;
  trash: TrashPage;
};

function rowSummary(row: TrashRow) {
  const content = row.content.trim();
  const detail = content === "" ? `${row.minutes}分` : `${content} ${row.minutes}分`;
  return `${row.dateJst} ${row.itemName}（${detail}・${trashStatusLabel(row.status)}）`;
}

export function TrashList({
  onPurgeDay,
  onPurgeRow,
  onRestoreDay,
  onRestoreRow,
  trash,
}: TrashListProps) {
  const [purgeDayTarget, setPurgeDayTarget] = useState<null | TrashDay>(null);
  const [purgeRowTarget, setPurgeRowTarget] = useState<null | TrashRow>(null);

  return (
    <>
      <Grid gap="md">
        <Grid.Col span={12}>
          <Title order={1}>ゴミ箱</Title>
          <Text c="dimmed" mt="xs" size="sm">
            30日経過すると自動で完全削除されます。
          </Text>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card h="100%">
            <Stack gap="md">
              <Title order={2}>日</Title>
              {trash.days.length === 0 ? <Text c="dimmed">ゴミ箱の日はありません。</Text> : null}
              {trash.days.map((day) => (
                <Grid key={day._id} align="center" gap="sm">
                  <Grid.Col span="auto">
                    <Text>{day.dateJst}</Text>
                  </Grid.Col>
                  <Grid.Col span="content">
                    <Group gap="xs">
                      <Button onClick={() => onRestoreDay(day._id)} variant="light">
                        戻す
                      </Button>
                      <Button color="red" onClick={() => setPurgeDayTarget(day)} variant="subtle">
                        完全削除
                      </Button>
                    </Group>
                  </Grid.Col>
                </Grid>
              ))}
            </Stack>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card h="100%">
            <Stack gap="md">
              <Title order={2}>記録</Title>
              {trash.rows.length === 0 ? <Text c="dimmed">ゴミ箱の記録はありません。</Text> : null}
              {trash.rows.map((row) => (
                <Grid key={row._id} align="center" gap="sm">
                  <Grid.Col span="auto">
                    <Text>{rowSummary(row)}</Text>
                  </Grid.Col>
                  <Grid.Col span="content">
                    <Group gap="xs">
                      <Button onClick={() => onRestoreRow(row._id)} variant="light">
                        戻す
                      </Button>
                      <Button color="red" onClick={() => setPurgeRowTarget(row)} variant="subtle">
                        完全削除
                      </Button>
                    </Group>
                  </Grid.Col>
                </Grid>
              ))}
            </Stack>
          </Card>
        </Grid.Col>
      </Grid>
      <Modal
        centered
        onClose={() => setPurgeDayTarget(null)}
        opened={purgeDayTarget !== null}
        title="日を完全削除"
      >
        <Stack gap="md">
          <Text>
            {purgeDayTarget?.dateJst} と、その日の記録を完全に削除します。元に戻せません。
          </Text>
          <Group justify="flex-end">
            <Button onClick={() => setPurgeDayTarget(null)} variant="default">
              キャンセル
            </Button>
            <Button
              color="red"
              onClick={() => {
                if (purgeDayTarget !== null) {
                  onPurgeDay(purgeDayTarget._id);
                  setPurgeDayTarget(null);
                }
              }}
            >
              完全削除
            </Button>
          </Group>
        </Stack>
      </Modal>
      <Modal
        centered
        onClose={() => setPurgeRowTarget(null)}
        opened={purgeRowTarget !== null}
        title="記録を完全削除"
      >
        <Stack gap="md">
          <Text>
            {purgeRowTarget === null ? "" : rowSummary(purgeRowTarget)}
            を完全に削除します。元に戻せません。
          </Text>
          <Group justify="flex-end">
            <Button onClick={() => setPurgeRowTarget(null)} variant="default">
              キャンセル
            </Button>
            <Button
              color="red"
              onClick={() => {
                if (purgeRowTarget !== null) {
                  onPurgeRow(purgeRowTarget._id);
                  setPurgeRowTarget(null);
                }
              }}
            >
              完全削除
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
