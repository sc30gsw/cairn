import {
  ActionBar,
  Button,
  Card,
  Checkbox,
  EmptyState,
  Grid,
  Group,
  Modal,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { IconCalendarEvent, IconNotes } from "@tabler/icons-react";
import { useState } from "react";

import { PageTitle } from "~/components/page-title";
import type {
  PurgeDayInput,
  PurgeRowInput,
  RestoreDayInput,
  RestoreManyInput,
  RestoreManyResult,
  RestoreRowInput,
} from "~/features/trash/types/mutations";
import type { TrashDay, TrashPage, TrashRow } from "~/features/trash/types/trash";
import { trashStatusLabel } from "~/lib/record-status-ui";

type TrashListProps = {
  onPurgeDay: (dayId: PurgeDayInput["dayId"]) => void;
  onPurgeRow: (rowId: PurgeRowInput["rowId"]) => void;
  onRestoreDay: (dayId: RestoreDayInput["dayId"]) => void;
  onRestoreMany: (input: RestoreManyInput) => Promise<RestoreManyResult | null>;
  onRestoreRow: (rowId: RestoreRowInput["rowId"]) => void;
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
  onRestoreMany,
  onRestoreRow,
  trash,
}: TrashListProps) {
  const [purgeDayTarget, setPurgeDayTarget] = useState<null | TrashDay>(null);
  const [purgeRowTarget, setPurgeRowTarget] = useState<null | TrashRow>(null);
  const [selectedDayIds, setSelectedDayIds] = useState<Set<TrashDay["_id"]>>(() => new Set());
  const [selectedRowIds, setSelectedRowIds] = useState<Set<TrashRow["_id"]>>(() => new Set());
  const [isRestoring, setIsRestoring] = useState(false);
  const trashedDayIds = new Set(trash.days.map((day) => day._id));
  const requiredDayIds = new Set<TrashDay["_id"]>();
  for (const row of trash.rows) {
    if (selectedRowIds.has(row._id) && trashedDayIds.has(row.dayId)) {
      requiredDayIds.add(row.dayId);
    }
  }
  const effectiveDayIds = new Set([...selectedDayIds, ...requiredDayIds]);
  const selectionCount = effectiveDayIds.size + selectedRowIds.size;
  const allDaysSelected =
    trash.days.length > 0 && trash.days.every((day) => effectiveDayIds.has(day._id));
  const allRowsSelected =
    trash.rows.length > 0 && trash.rows.every((row) => selectedRowIds.has(row._id));

  const toggleDay = (dayId: TrashDay["_id"]) => {
    if (effectiveDayIds.has(dayId)) {
      setSelectedDayIds((current) => {
        const next = new Set(current);
        next.delete(dayId);
        return next;
      });
      setSelectedRowIds((current) => {
        return new Set(
          [...current].filter(
            (rowId) => trash.rows.find((row) => row._id === rowId)?.dayId !== dayId,
          ),
        );
      });
      return;
    }
    setSelectedDayIds((current) => new Set(current).add(dayId));
  };

  const toggleRow = (row: TrashRow) => {
    setSelectedRowIds((current) => {
      const next = new Set(current);
      if (next.has(row._id)) {
        next.delete(row._id);
      } else {
        next.add(row._id);
      }
      return next;
    });
  };

  const restoreSelected = async () => {
    if (isRestoring) {
      return;
    }
    setIsRestoring(true);
    try {
      const result = await onRestoreMany({
        dayIds: [...effectiveDayIds],
        rowIds: [...selectedRowIds],
      });
      if (result === null) {
        return;
      }
      setSelectedDayIds((current) => {
        const restored = new Set(result.restoredDayIds);
        return new Set([...current].filter((dayId) => !restored.has(dayId)));
      });
      setSelectedRowIds((current) => {
        const restored = new Set(result.restoredRowIds);
        return new Set([...current].filter((rowId) => !restored.has(rowId)));
      });
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <>
      <Grid gap="md" pb={selectionCount > 0 ? 80 : undefined}>
        <Grid.Col span={12}>
          <PageTitle>ゴミ箱</PageTitle>
          <Text c="dimmed" mt="xs" size="sm">
            30日経過すると自動で完全削除されます。
          </Text>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card h="100%">
            <Stack gap="md">
              <Group justify="space-between">
                <Title order={2}>日</Title>
                <Checkbox
                  checked={allDaysSelected}
                  indeterminate={!allDaysSelected && effectiveDayIds.size > 0}
                  label="すべて選択"
                  onChange={() =>
                    setSelectedDayIds(
                      allDaysSelected ? new Set() : new Set(trash.days.map((day) => day._id)),
                    )
                  }
                />
              </Group>
              {trash.days.length === 0 ? (
                <EmptyState
                  description="見送りにした日はここに入ります。"
                  icon={<IconCalendarEvent aria-hidden />}
                  title="ゴミ箱の日はありません"
                />
              ) : null}
              {trash.days.map((day) => (
                <Grid key={day._id} align="center" gap="sm">
                  <Grid.Col span="auto">
                    <Checkbox
                      checked={effectiveDayIds.has(day._id)}
                      label={day.dateJst}
                      onChange={() => toggleDay(day._id)}
                    />
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
              <Group justify="space-between">
                <Title order={2}>記録</Title>
                <Checkbox
                  checked={allRowsSelected}
                  indeterminate={!allRowsSelected && selectedRowIds.size > 0}
                  label="すべて選択"
                  onChange={() =>
                    setSelectedRowIds(
                      allRowsSelected ? new Set() : new Set(trash.rows.map((row) => row._id)),
                    )
                  }
                />
              </Group>
              {trash.rows.length === 0 ? (
                <EmptyState
                  description="見送りにした記録はここに入ります。"
                  icon={<IconNotes aria-hidden />}
                  title="ゴミ箱の記録はありません"
                />
              ) : null}
              {trash.rows.map((row) => (
                <Grid key={row._id} align="center" gap="sm">
                  <Grid.Col span="auto">
                    <Checkbox
                      checked={selectedRowIds.has(row._id)}
                      label={rowSummary(row)}
                      onChange={() => toggleRow(row)}
                    />
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
      <ActionBar
        opened={selectionCount > 0}
        onClose={() => {
          setSelectedDayIds(new Set());
          setSelectedRowIds(new Set());
        }}
        styles={{
          root: {
            bottom: "calc(var(--cairn-bottom-nav-h) + env(safe-area-inset-bottom, 0px) + 12px)",
          },
        }}
      >
        <Stack gap={2}>
          <Text size="sm">{selectionCount}件を選択中</Text>
          {requiredDayIds.size > 0 ? (
            <Text c="dimmed" size="xs">
              選択した記録の親の日も復元します
            </Text>
          ) : null}
        </Stack>
        <ActionBar.Divider />
        <Button disabled={isRestoring} onClick={() => void restoreSelected()} size="compact-sm">
          {isRestoring ? "復元中…" : "選択を復元"}
        </Button>
        <ActionBar.CloseButton />
      </ActionBar>
    </>
  );
}
