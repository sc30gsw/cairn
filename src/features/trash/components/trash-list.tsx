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
import { Result } from "better-result";
import { useState } from "react";
import { TRASH_PURGE_SELECTION_LIMIT } from "~domain/trashSelection";

import { OverflowTooltip } from "~/components/overflow-tooltip";
import { PageTitle } from "~/components/page-title";
import type {
  PurgeDayInput,
  PurgeManyInput,
  PurgeManyResult,
  PurgeRowInput,
  RestoreDayInput,
  RestoreManyInput,
  RestoreManyResult,
  RestoreRowInput,
} from "~/features/trash/types/mutations";
import type { TrashDay, TrashPage, TrashRow } from "~/features/trash/types/trash";
import type { MutationFailedError } from "~/lib/errors";
import { trashStatusLabel } from "~/lib/record-status-ui";

import classes from "~/features/trash/components/trash-list.module.css";

type TrashListProps = {
  onPurgeDay: (dayId: PurgeDayInput["dayId"]) => void;
  onPurgeMany: (input: PurgeManyInput) => Promise<Result<PurgeManyResult, MutationFailedError>>;
  onPurgeRow: (rowId: PurgeRowInput["rowId"]) => void;
  onRestoreDay: (dayId: RestoreDayInput["dayId"]) => void;
  onRestoreMany: (input: RestoreManyInput) => Promise<RestoreManyResult | null>;
  onRestoreRow: (rowId: RestoreRowInput["rowId"]) => void;
  trash: TrashPage;
};

type TrashPurgeModalsProps = {
  clearDaySelection: (dayId: TrashDay["_id"]) => void;
  clearRowSelection: (rowId: TrashRow["_id"]) => void;
  onPurgeDay: (dayId: PurgeDayInput["dayId"]) => void;
  onPurgeRow: (rowId: PurgeRowInput["rowId"]) => void;
  purgeDayTarget: TrashDay | null;
  purgeRowTarget: TrashRow | null;
  setPurgeDayTarget: (day: TrashDay | null) => void;
  setPurgeRowTarget: (row: TrashRow | null) => void;
};

type RestoreFailureMessage = {
  id: string;
  label: string;
  reason: string;
};

type TrashSelectionActionBarProps = {
  failureMessages: readonly RestoreFailureMessage[];
  isPurging: boolean;
  isRestoring: boolean;
  onClear: () => void;
  onPurge: () => void;
  onRestore: () => void;
  requiredDayCount: number;
  selectedDayCount: number;
  selectedRowCount: number;
  selectionLimitExceeded: boolean;
  selectionCount: number;
};

type TrashBulkPurgeModalProps = {
  implicitRequiredDayCount: number;
  isPurging: boolean;
  onClose: () => void;
  onConfirm: () => void;
  opened: boolean;
  selectedDayCount: number;
  selectedRowCount: number;
};

function rowSummary(row: TrashRow) {
  const content = row.content.trim();
  const detail = content === "" ? `${row.minutes}分` : `${content} ${row.minutes}分`;
  return `${row.dateJst} ${row.itemName}（${detail}・${trashStatusLabel(row.status)}）`;
}

function TrashRowLabel({ row }: { row: TrashRow }) {
  const summary = rowSummary(row);
  return (
    <OverflowTooltip<HTMLSpanElement> content={summary}>
      {(ref) => (
        <Text component="span" ref={ref} lineClamp={1}>
          {summary}
        </Text>
      )}
    </OverflowTooltip>
  );
}

function TrashPurgeModals({
  onPurgeDay,
  onPurgeRow,
  purgeDayTarget,
  purgeRowTarget,
  clearDaySelection,
  clearRowSelection,
  setPurgeDayTarget,
  setPurgeRowTarget,
}: TrashPurgeModalsProps) {
  return (
    <>
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
                  clearDaySelection(purgeDayTarget._id);
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
                  clearRowSelection(purgeRowTarget._id);
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

function TrashBulkPurgeModal({
  implicitRequiredDayCount,
  isPurging,
  onClose,
  onConfirm,
  opened,
  selectedDayCount,
  selectedRowCount,
}: TrashBulkPurgeModalProps) {
  return (
    <Modal centered onClose={onClose} opened={opened} title="選択した項目を完全削除">
      <Stack gap="md">
        <Text>
          日 {selectedDayCount}件と記録 {selectedRowCount}
          件を完全に削除します。選択した日には、その日のすべての記録が含まれます。元に戻せません。
        </Text>
        {implicitRequiredDayCount > 0 ? (
          <Text c="dimmed" size="sm">
            復元のために選択状態になっている親の日 {implicitRequiredDayCount}
            件は、今回の完全削除には含まれません。
          </Text>
        ) : null}
        <Group justify="flex-end">
          <Button disabled={isPurging} onClick={onClose} variant="default">
            キャンセル
          </Button>
          <Button color="red" loading={isPurging} onClick={onConfirm}>
            完全削除
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

function TrashSelectionActionBar({
  failureMessages,
  isPurging,
  isRestoring,
  onClear,
  onPurge,
  onRestore,
  requiredDayCount,
  selectedDayCount,
  selectedRowCount,
  selectionLimitExceeded,
  selectionCount,
}: TrashSelectionActionBarProps) {
  const hasFailedSelection = failureMessages.length > 0;
  return (
    <ActionBar
      className={classes.selectionActionBar}
      opened={selectionCount > 0}
      onClose={onClear}
      styles={{
        root: {
          bottom: "calc(var(--cairn-bottom-nav-h) + env(safe-area-inset-bottom, 0px) + 12px)",
        },
      }}
    >
      <Stack gap={2}>
        <Text size="sm">
          日 {selectedDayCount}件・記録 {selectedRowCount}件を選択中
        </Text>
        {requiredDayCount > 0 ? (
          <Text c="dimmed" size="xs">
            復元では、選択した記録の親の日 {requiredDayCount}
            件も対象になります。完全削除には含めません。
          </Text>
        ) : null}
        {hasFailedSelection ? (
          <Stack gap={2}>
            <Text c="red" size="xs">
              一部の対象を復元できませんでした。失敗対象を選択したまま再試行できます。
            </Text>
            {failureMessages.slice(0, 2).map((failure) => (
              <Text c="red" key={failure.id} size="xs">
                {failure.label}: {failure.reason}
              </Text>
            ))}
            {failureMessages.length > 2 ? (
              <Text c="red" size="xs">
                ほか {failureMessages.length - 2}件
              </Text>
            ) : null}
          </Stack>
        ) : null}
        {selectionLimitExceeded ? (
          <Text c="red" size="xs">
            まとめて完全削除は {TRASH_PURGE_SELECTION_LIMIT}
            件までです。選択を減らしてください。
          </Text>
        ) : null}
      </Stack>
      <ActionBar.Divider className={classes.selectionDivider} />
      <Group className={classes.selectionActions} gap="xs" wrap="nowrap">
        <Button
          className={classes.selectionActionButton}
          disabled={isPurging || isRestoring}
          onClick={onRestore}
          size="compact-sm"
        >
          {isRestoring ? "復元中…" : hasFailedSelection ? "失敗した対象を再試行" : "まとめて戻す"}
        </Button>
        <Button
          className={classes.selectionActionButton}
          color="red"
          disabled={isPurging || isRestoring || selectionLimitExceeded}
          onClick={onPurge}
          size="compact-sm"
          variant="light"
        >
          まとめて完全削除
        </Button>
        <ActionBar.CloseButton aria-label="選択解除" />
      </Group>
    </ActionBar>
  );
}

type TrashDayCardProps = {
  allSelected: boolean;
  days: TrashPage["days"];
  onPurge: (day: TrashDay) => void;
  onRestore: (dayId: RestoreDayInput["dayId"]) => void;
  onSelectAll: () => void;
  onToggle: (dayId: TrashDay["_id"]) => void;
  requiredDayIds: ReadonlySet<TrashDay["_id"]>;
  selectedDayIds: ReadonlySet<TrashDay["_id"]>;
};

function TrashDayCard({
  allSelected,
  days,
  onPurge,
  onRestore,
  onSelectAll,
  onToggle,
  requiredDayIds,
  selectedDayIds,
}: TrashDayCardProps) {
  return (
    <Card h="100%">
      <Stack gap="md">
        <Group justify="space-between">
          <Title order={2}>日</Title>
          <Checkbox
            checked={allSelected}
            indeterminate={!allSelected && selectedDayIds.size > 0}
            label="すべて選択"
            onChange={onSelectAll}
          />
        </Group>
        {days.length === 0 ? (
          <EmptyState
            description="見送りにした日はここに入ります。"
            icon={<IconCalendarEvent aria-hidden />}
            title="ゴミ箱の日はありません"
          />
        ) : null}
        {days.map((day) => (
          <Grid key={day._id} align="center" gap="sm">
            <Grid.Col span="auto">
              <Checkbox
                checked={selectedDayIds.has(day._id)}
                indeterminate={!selectedDayIds.has(day._id) && requiredDayIds.has(day._id)}
                label={day.dateJst}
                onChange={() => onToggle(day._id)}
              />
            </Grid.Col>
            <Grid.Col span="content">
              <Group gap="xs">
                <Button onClick={() => onRestore(day._id)} variant="light">
                  戻す
                </Button>
                <Button color="red" onClick={() => onPurge(day)} variant="subtle">
                  完全削除
                </Button>
              </Group>
            </Grid.Col>
          </Grid>
        ))}
      </Stack>
    </Card>
  );
}

type TrashRowCardProps = {
  allSelected: boolean;
  onPurge: (row: TrashRow) => void;
  onRestore: (rowId: RestoreRowInput["rowId"]) => void;
  onSelectAll: () => void;
  onToggle: (row: TrashRow) => void;
  rows: TrashPage["rows"];
  selectedRowIds: ReadonlySet<TrashRow["_id"]>;
};

function TrashRowCard({
  allSelected,
  onPurge,
  onRestore,
  onSelectAll,
  onToggle,
  rows,
  selectedRowIds,
}: TrashRowCardProps) {
  return (
    <Card h="100%">
      <Stack gap="md">
        <Group justify="space-between">
          <Title order={2}>記録</Title>
          <Checkbox
            checked={allSelected}
            indeterminate={!allSelected && selectedRowIds.size > 0}
            label="すべて選択"
            onChange={onSelectAll}
          />
        </Group>
        {rows.length === 0 ? (
          <EmptyState
            description="見送りにした記録はここに入ります。"
            icon={<IconNotes aria-hidden />}
            title="ゴミ箱の記録はありません"
          />
        ) : null}
        {rows.map((row) => (
          <Grid key={row._id} align="center" gap="sm">
            <Grid.Col span="auto">
              <Checkbox
                checked={selectedRowIds.has(row._id)}
                label={<TrashRowLabel row={row} />}
                onChange={() => onToggle(row)}
              />
            </Grid.Col>
            <Grid.Col span="content">
              <Group gap="xs">
                <Button onClick={() => onRestore(row._id)} variant="light">
                  戻す
                </Button>
                <Button color="red" onClick={() => onPurge(row)} variant="subtle">
                  完全削除
                </Button>
              </Group>
            </Grid.Col>
          </Grid>
        ))}
      </Stack>
    </Card>
  );
}

export function TrashList({
  onPurgeDay,
  onPurgeMany,
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
  const [bulkPurgeOpened, setBulkPurgeOpened] = useState(false);
  const [isPurging, setIsPurging] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreFailures, setRestoreFailures] = useState<
    Pick<RestoreManyResult, "failedDayReasons" | "failedRowReasons">
  >({ failedDayReasons: [], failedRowReasons: [] });
  const trashedDayIds = new Set(trash.days.map((day) => day._id));
  const requiredDayIds = new Set<TrashDay["_id"]>();
  for (const row of trash.rows) {
    if (selectedRowIds.has(row._id) && trashedDayIds.has(row.dayId)) {
      requiredDayIds.add(row.dayId);
    }
  }
  const effectiveDayIds = new Set([...selectedDayIds, ...requiredDayIds]);
  const implicitRequiredDayIds = new Set(
    [...requiredDayIds].filter((dayId) => !selectedDayIds.has(dayId)),
  );
  const selectionCount = selectedDayIds.size + selectedRowIds.size;
  const selectionLimitExceeded = selectionCount > TRASH_PURGE_SELECTION_LIMIT;
  const failureMessages: RestoreFailureMessage[] = [
    ...restoreFailures.failedDayReasons.map(({ dayId, reason }) => ({
      id: `day:${dayId}`,
      label: `${trash.days.find((day) => day._id === dayId)?.dateJst ?? "日"}の日`,
      reason,
    })),
    ...restoreFailures.failedRowReasons.map(({ rowId, reason }) => ({
      id: `row:${rowId}`,
      label: trash.rows.find((row) => row._id === rowId)?.itemName ?? "記録",
      reason,
    })),
  ];
  const allDaysSelected =
    trash.days.length > 0 && trash.days.every((day) => selectedDayIds.has(day._id));
  const allRowsSelected =
    trash.rows.length > 0 && trash.rows.every((row) => selectedRowIds.has(row._id));

  const clearDaySelection = (dayId: TrashDay["_id"]) => {
    const rowIdsForDay = new Set(
      trash.rows.reduce<TrashRow["_id"][]>(
        (rowIds, row) => (row.dayId === dayId ? rowIds.concat(row._id) : rowIds),
        [],
      ),
    );
    setSelectedDayIds((current) => {
      const next = new Set(current);
      next.delete(dayId);
      return next;
    });
    setSelectedRowIds(
      (current) => new Set([...current].filter((rowId) => !rowIdsForDay.has(rowId))),
    );
    setRestoreFailures((current) => ({
      failedDayReasons: current.failedDayReasons.filter((failure) => failure.dayId !== dayId),
      failedRowReasons: current.failedRowReasons.filter(
        (failure) => !rowIdsForDay.has(failure.rowId),
      ),
    }));
  };

  const clearRowSelection = (rowId: TrashRow["_id"]) => {
    setSelectedRowIds((current) => {
      const next = new Set(current);
      next.delete(rowId);
      return next;
    });
    setRestoreFailures((current) => ({
      ...current,
      failedRowReasons: current.failedRowReasons.filter((failure) => failure.rowId !== rowId),
    }));
  };

  const clearSelection = () => {
    setSelectedDayIds(new Set());
    setSelectedRowIds(new Set());
    setRestoreFailures({ failedDayReasons: [], failedRowReasons: [] });
  };

  const removeDaySelection = (dayId: TrashDay["_id"]) => {
    setSelectedDayIds((current) => {
      const next = new Set(current);
      next.delete(dayId);
      return next;
    });
    setRestoreFailures((current) => ({
      ...current,
      failedDayReasons: current.failedDayReasons.filter((failure) => failure.dayId !== dayId),
    }));
  };

  const toggleDay = (dayId: TrashDay["_id"]) => {
    if (selectedDayIds.has(dayId)) {
      removeDaySelection(dayId);
      return;
    }
    setSelectedDayIds((current) => new Set(current).add(dayId));
  };

  const toggleRow = (row: TrashRow) => {
    if (selectedRowIds.has(row._id)) {
      clearRowSelection(row._id);
      return;
    }
    setSelectedRowIds((current) => {
      const next = new Set(current);
      next.add(row._id);
      return next;
    });
  };

  const restoreSelected = async () => {
    if (isPurging || isRestoring) {
      return;
    }
    setIsRestoring(true);
    const result = await onRestoreMany({
      dayIds: [...effectiveDayIds],
      rowIds: [...selectedRowIds],
    }).finally(() => {
      setIsRestoring(false);
    });
    if (result === null) {
      return;
    }
    setRestoreFailures({
      failedDayReasons: result.failedDayReasons,
      failedRowReasons: result.failedRowReasons,
    });
    setSelectedDayIds((current) => {
      const restored = new Set(result.restoredDayIds);
      return new Set([...current].filter((dayId) => !restored.has(dayId)));
    });
    setSelectedRowIds((current) => {
      const restored = new Set(result.restoredRowIds);
      return new Set([...current].filter((rowId) => !restored.has(rowId)));
    });
  };

  const purgeSelected = async () => {
    if (isPurging || isRestoring) {
      return;
    }
    setIsPurging(true);
    const result = await onPurgeMany({
      dayIds: [...selectedDayIds],
      rowIds: [...selectedRowIds],
    }).finally(() => {
      setIsPurging(false);
    });
    if (Result.isError(result)) {
      return;
    }
    clearSelection();
    setBulkPurgeOpened(false);
  };

  return (
    <>
      <Grid gap="md" pb={selectionCount > 0 ? { base: 180, sm: 100 } : undefined}>
        <Grid.Col span={12}>
          <PageTitle>ゴミ箱</PageTitle>
          <Text c="dimmed" mt="xs" size="sm">
            30日経過すると自動で完全削除されます。
          </Text>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <TrashDayCard
            allSelected={allDaysSelected}
            days={trash.days}
            onPurge={setPurgeDayTarget}
            onRestore={(dayId) => {
              clearDaySelection(dayId);
              onRestoreDay(dayId);
            }}
            onSelectAll={() =>
              setSelectedDayIds(
                allDaysSelected ? new Set() : new Set(trash.days.map((day) => day._id)),
              )
            }
            onToggle={toggleDay}
            requiredDayIds={requiredDayIds}
            selectedDayIds={selectedDayIds}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <TrashRowCard
            allSelected={allRowsSelected}
            onPurge={setPurgeRowTarget}
            onRestore={(rowId) => {
              clearRowSelection(rowId);
              onRestoreRow(rowId);
            }}
            onSelectAll={() =>
              setSelectedRowIds(
                allRowsSelected ? new Set() : new Set(trash.rows.map((row) => row._id)),
              )
            }
            onToggle={toggleRow}
            rows={trash.rows}
            selectedRowIds={selectedRowIds}
          />
        </Grid.Col>
      </Grid>
      <TrashPurgeModals
        clearDaySelection={clearDaySelection}
        clearRowSelection={clearRowSelection}
        onPurgeDay={onPurgeDay}
        onPurgeRow={onPurgeRow}
        purgeDayTarget={purgeDayTarget}
        purgeRowTarget={purgeRowTarget}
        setPurgeDayTarget={setPurgeDayTarget}
        setPurgeRowTarget={setPurgeRowTarget}
      />
      <TrashBulkPurgeModal
        implicitRequiredDayCount={implicitRequiredDayIds.size}
        isPurging={isPurging}
        onClose={() => {
          if (!isPurging) {
            setBulkPurgeOpened(false);
          }
        }}
        onConfirm={() => void purgeSelected()}
        opened={bulkPurgeOpened}
        selectedDayCount={selectedDayIds.size}
        selectedRowCount={selectedRowIds.size}
      />
      <TrashSelectionActionBar
        failureMessages={failureMessages}
        isPurging={isPurging}
        isRestoring={isRestoring}
        onClear={() => {
          if (!isPurging && !isRestoring) {
            clearSelection();
          }
        }}
        onPurge={() => setBulkPurgeOpened(true)}
        onRestore={() => void restoreSelected()}
        requiredDayCount={implicitRequiredDayIds.size}
        selectedDayCount={selectedDayIds.size}
        selectedRowCount={selectedRowIds.size}
        selectionLimitExceeded={selectionLimitExceeded}
        selectionCount={selectionCount}
      />
    </>
  );
}
