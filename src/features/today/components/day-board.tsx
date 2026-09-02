import {
  Alert,
  Box,
  Button,
  Card,
  EmptyState,
  Grid,
  Group,
  Select,
  Stack,
  Text,
  Title,
  type ComboboxItem,
} from "@mantine/core";
import { IconNotes } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { isDateJst, type DateJst } from "~domain/jst";

import { ConcreteActionTour, ConcreteActionTourTrigger } from "~/components/concrete-action-tour";
import { CONCRETE_ACTION_TOUR_TARGETS } from "~/components/concrete-action-tour-targets";
import { LearningDateNavigation } from "~/components/learning-date-navigation";
import { ShareCopy } from "~/components/share-copy";
import { AdhocRowForm } from "~/features/today/components/adhoc-row-form";
import {
  useOptionalDayBoardContext,
  type DayBoardContextValue,
} from "~/features/today/components/day-board-context";
import { DayBoardKanbanLink } from "~/features/today/components/day-board-kanban-link";
import { DayMetaPanel } from "~/features/today/components/day-meta-panel";
import { RowEditor } from "~/features/today/components/row-editor";
import { useApplyPresetFromSearch } from "~/features/today/hooks/use-apply-preset-from-search";
import { useDayBoardActions } from "~/features/today/hooks/use-day-board-actions";
import { emptyDayCopy } from "~/features/today/lib/empty-day-copy";
import { weekdayPresetId } from "~/features/today/lib/weekday-preset";
import { onRequiredSelect } from "~/lib/select";
import { BODY_FONT, NUMERAL_FONT } from "~/lib/theme";
import type { PresetDto, PresetId } from "~/types/item";
import { parsePresetId, unwrapPresetId } from "~/types/item";

type DayBoardProps = {
  interactive?: boolean;
} & Partial<DayBoardContextValue>;

function requireDayBoardField<K extends keyof DayBoardContextValue>(
  context: DayBoardContextValue | null,
  overrides: Partial<DayBoardContextValue>,
  key: K,
): DayBoardContextValue[K] {
  const value = overrides[key] ?? context?.[key];
  if (value === undefined) {
    throw new Error(`DayBoard requires ${String(key)} via props or DayBoardProvider`);
  }
  return value;
}

function presetSelectData(presets: PresetDto[]): ComboboxItem[] {
  return presets.map((preset) => ({ label: preset.name, value: preset._id }));
}

function DayPresetSelect({
  dateJst,
  isRest,
  isToday,
  onSwitchPreset,
  presets,
  selectedPresetId,
}: {
  dateJst: DateJst;
  isRest: boolean;
  isToday: boolean;
  onSwitchPreset: (presetId: PresetDto["_id"]) => void;
  presets: PresetDto[];
  selectedPresetId: null | PresetId;
}) {
  const navigate = useNavigate();
  const defaultPresetId = weekdayPresetId(dateJst, presets);
  const [appliedPresetId, setAppliedPresetId] = useState<null | PresetId>(null);
  const value = isToday
    ? (selectedPresetId ?? defaultPresetId)
    : (appliedPresetId ?? (isRest ? null : defaultPresetId));

  return (
    <Select
      aria-label="プリセット切替"
      data={presetSelectData(presets)}
      label="この日の雛形"
      onChange={onRequiredSelect((raw) => {
        const presetId = unwrapPresetId(parsePresetId(raw));
        if (isToday) {
          void navigate({
            to: ".",
            search: (current) => ({
              ...current,
              preset: presetId === defaultPresetId ? undefined : presetId,
            }),
          });
        } else {
          setAppliedPresetId(presetId);
        }
        onSwitchPreset(presetId);
      })}
      placeholder="切り替える"
      value={value}
    />
  );
}

export function DayBoard(props: DayBoardProps) {
  const context = useOptionalDayBoardContext();
  const interactive = props.interactive ?? true;
  const dateJst = requireDayBoardField(context, props, "dateJst");
  const day = requireDayBoardField(context, props, "day");
  const items = requireDayBoardField(context, props, "items");
  const presets = requireDayBoardField(context, props, "presets");
  const todayJst = requireDayBoardField(context, props, "todayJst");
  const presetFromSearch = props.presetFromSearch ?? context?.presetFromSearch;
  const remainderMessage = props.remainderMessage ?? context?.remainderMessage ?? null;
  const onConfirmedCategory = props.onConfirmedCategory ?? context?.onConfirmedCategory;
  const navigate = useNavigate();
  const isToday = dateJst === todayJst;
  const {
    onAddRow,
    onConfirm,
    onCopyYesterday,
    onFlagReview,
    onRemoveDay,
    onRemoveRow,
    onSaveCondition,
    onSaveMemo,
    onSkip,
    onSwitchPreset,
    onUnflagReview,
    onUnskip,
  } = useDayBoardActions(dateJst, day.rows, { onConfirmedCategory });
  const { appliedPresetRef, selectedPresetId } = useApplyPresetFromSearch(
    dateJst,
    presetFromSearch,
    isToday,
  );
  const canEdit = day.kind !== "unrecorded";
  const emptyCopy = emptyDayCopy(day.kind);

  const goToDate = (next: string) => {
    if (!isDateJst(next)) {
      return;
    }
    if (next === todayJst) {
      void navigate({ to: "/" });
      return;
    }
    void navigate({ params: { dateJst: next }, to: "/days/$dateJst" });
  };

  return (
    <ConcreteActionTour screen="today">
      <Stack gap="md">
        <Card>
          <Grid align="center">
            <Grid.Col span={{ base: 12, sm: 7 }}>
              <LearningDateNavigation
                dateJst={dateJst}
                linkSlot={
                  <Text c="dimmed" size="sm">
                    <DayBoardKanbanLink />
                  </Text>
                }
                onDateChange={goToDate}
                onGoToToday={() => void navigate({ to: "/" })}
                todayJst={todayJst}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 5 }}>
              <Text c="dimmed" size="sm">
                学習量
              </Text>
              <Title ff={NUMERAL_FONT} fw={700} lh={1} order={1}>
                {day.volumeMinutes}
                <Text c="dimmed" ff={BODY_FONT} fz="lg" span>
                  分
                </Text>
              </Title>
            </Grid.Col>
          </Grid>
        </Card>
        {canEdit ? (
          <Card>
            <Stack gap="sm">
              <Title order={3}>プリセット</Title>
              <DayPresetSelect
                key={dateJst}
                dateJst={dateJst}
                isRest={day.kind === "rest"}
                isToday={isToday}
                onSwitchPreset={(presetId) => {
                  if (!interactive) {
                    return;
                  }
                  void onSwitchPreset(presetId, appliedPresetRef);
                }}
                presets={presets}
                selectedPresetId={selectedPresetId}
              />
            </Stack>
          </Card>
        ) : null}
        <Card>
          <Stack gap="md">
            <Group gap="xs" wrap="nowrap">
              <Title order={2}>記録</Title>
              <ConcreteActionTourTrigger />
            </Group>
            {day.rows.map((row, index) =>
              index === 0 ? (
                <Box key={row._id} data-onboarding-tour-id={CONCRETE_ACTION_TOUR_TARGETS.today}>
                  <RowEditor
                    disabled={!canEdit || !interactive}
                    onConfirm={interactive ? onConfirm : () => {}}
                    onFlagReview={interactive ? onFlagReview : () => {}}
                    onRemove={interactive ? onRemoveRow : () => {}}
                    onSkip={interactive ? onSkip : () => {}}
                    onUnflagReview={interactive ? onUnflagReview : () => {}}
                    onUnskip={interactive ? onUnskip : () => {}}
                    row={row}
                    todayJst={todayJst}
                  />
                </Box>
              ) : (
                <RowEditor
                  key={row._id}
                  disabled={!canEdit || !interactive}
                  onConfirm={interactive ? onConfirm : () => {}}
                  onFlagReview={interactive ? onFlagReview : () => {}}
                  onRemove={interactive ? onRemoveRow : () => {}}
                  onSkip={interactive ? onSkip : () => {}}
                  onUnflagReview={interactive ? onUnflagReview : () => {}}
                  onUnskip={interactive ? onUnskip : () => {}}
                  row={row}
                  todayJst={todayJst}
                />
              ),
            )}
            {day.rows.length === 0 ? (
              <Box data-onboarding-tour-id={CONCRETE_ACTION_TOUR_TARGETS.today}>
                <EmptyState
                  description={emptyCopy.description}
                  icon={<IconNotes aria-hidden />}
                  title={emptyCopy.title}
                />
              </Box>
            ) : null}
            {remainderMessage === null ? null : (
              <Alert color="blue" title="週間ターゲット">
                {remainderMessage}
              </Alert>
            )}
            {canEdit && interactive ? (
              <Button disabled={!day.canCopyYesterday} onClick={onCopyYesterday} variant="light">
                昨日の確定をコピー
              </Button>
            ) : null}
            {canEdit && interactive ? <AdhocRowForm items={items} onAdd={onAddRow} /> : null}
          </Stack>
        </Card>
        {canEdit ? (
          <Card>
            <DayMetaPanel
              condition={day.day?.condition ?? null}
              memo={day.day?.memo ?? null}
              onSaveCondition={interactive ? onSaveCondition : () => {}}
              onSaveMemo={interactive ? onSaveMemo : () => {}}
            />
          </Card>
        ) : null}
        <Card>
          <ShareCopy markdown={day.shareMarkdown} />
        </Card>
        {canEdit && interactive && day.day !== null ? (
          <Button color="red" onClick={onRemoveDay} variant="light">
            この日をゴミ箱へ
          </Button>
        ) : null}
      </Stack>
    </ConcreteActionTour>
  );
}
