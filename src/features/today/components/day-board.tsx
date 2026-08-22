import {
  ActionIcon,
  Alert,
  Box,
  Button,
  Card,
  EmptyState,
  Grid,
  Group,
  Input,
  Select,
  Stack,
  Text,
  Title,
  Tooltip,
  type ComboboxItem,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { IconChevronLeft, IconChevronRight, IconNotes, IconRefresh } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  addDaysJst,
  isDateJst,
  isFutureDateJst,
  weekdayFromDateJst,
  type DateJst,
} from "~domain/jst";

import { BoardKanbanCrossLink } from "~/components/board-day-cross-links";
import { ConcreteActionTour, ConcreteActionTourTrigger } from "~/components/concrete-action-tour";
import { CONCRETE_ACTION_TOUR_TARGETS } from "~/components/concrete-action-tour-targets";
import { AdhocRowForm } from "~/features/today/components/adhoc-row-form";
import { DayMetaPanel } from "~/features/today/components/day-meta-panel";
import { RowEditor } from "~/features/today/components/row-editor";
import { ShareCopy } from "~/features/today/components/share-copy";
import { useApplyPresetFromSearch } from "~/features/today/hooks/use-apply-preset-from-search";
import { useDayBoardActions } from "~/features/today/hooks/use-day-board-actions";
import { emptyDayCopy } from "~/features/today/lib/empty-day-copy";
import type { DaySearch } from "~/features/today/schemas/day-search-schema";
import type { DayPage } from "~/features/today/types/day";
import { calendarDayProps, calendarDayStyleClasses } from "~/lib/calendar-day-style";
import { onRequiredSelect } from "~/lib/select";
import { BODY_FONT, NUMERAL_FONT } from "~/lib/theme";
import type { ItemDto, PresetDto, PresetId } from "~/types/item";
import { parsePresetId, unwrapPresetId } from "~/types/item";

import classes from "~/lib/learning-date-input.module.css";

type DayBoardProps = {
  dateJst: DateJst;
  day: DayPage;
  interactive?: boolean;
  items: ItemDto[];
  onConfirmedCategory?: (category: string) => void;
  presetFromSearch?: DaySearch["preset"];
  presets: PresetDto[];
  remainderMessage?: string | null;
  todayJst: DateJst;
};

export function weekdayPresetId(dateJst: DateJst, presets: PresetDto[]) {
  return presets.find((preset) => preset.weekday === weekdayFromDateJst(dateJst))?._id ?? null;
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

export function DayBoard({
  dateJst,
  day,
  interactive = true,
  items,
  onConfirmedCategory,
  presetFromSearch,
  presets,
  remainderMessage = null,
  todayJst,
}: DayBoardProps) {
  const navigate = useNavigate();
  const isToday = dateJst === todayJst;
  const {
    onAddRow,
    onConfirm,
    onCopyYesterday,
    onRemoveDay,
    onRemoveRow,
    onSaveCondition,
    onSaveMemo,
    onSkip,
    onSwitchPreset,
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

  const pickLearningDate = (next: string) => {
    if (isFutureDateJst(next, todayJst)) {
      return;
    }
    goToDate(next);
  };

  return (
    <ConcreteActionTour screen="today">
      <Stack gap="md">
        <Card>
          <Grid align="center">
            <Grid.Col span={{ base: 12, sm: 7 }}>
              <Group align="flex-end" gap="sm" wrap="wrap">
                <Input.Wrapper label="学習日">
                  <Group align="center" gap={4} mt={4} wrap="nowrap">
                    <DatePickerInput
                      aria-label="学習日"
                      classNames={{
                        input: classes.learningDateInput,
                        month: calendarDayStyleClasses.japaneseCalendar,
                      }}
                      firstDayOfWeek={1}
                      getDayProps={(date) => calendarDayProps(date, todayJst)}
                      getMonthControlProps={(month) => ({
                        disabled: month.slice(0, 7) > todayJst.slice(0, 7),
                      })}
                      getYearControlProps={(year) => ({
                        disabled: year.slice(0, 4) > todayJst.slice(0, 4),
                      })}
                      locale="ja"
                      maxDate={todayJst}
                      miw={0}
                      onChange={(value) => {
                        if (typeof value === "string") {
                          pickLearningDate(value);
                        }
                      }}
                      popoverProps={{ withinPortal: true }}
                      value={dateJst}
                      valueFormat="YYYY-MM-DD"
                      w="fit-content"
                    />
                    <Tooltip label="前の日" withArrow>
                      <ActionIcon
                        aria-label="前の日"
                        onClick={() => goToDate(addDaysJst(dateJst, -1))}
                        size="input-sm"
                        variant="subtle"
                      >
                        <IconChevronLeft aria-hidden size={18} stroke={1.75} />
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label="次の日" withArrow>
                      <Box component="span" display="inline-flex">
                        <ActionIcon
                          aria-label="次の日"
                          disabled={dateJst >= todayJst}
                          onClick={() => goToDate(addDaysJst(dateJst, 1))}
                          size="input-sm"
                          variant="subtle"
                        >
                          <IconChevronRight aria-hidden size={18} stroke={1.75} />
                        </ActionIcon>
                      </Box>
                    </Tooltip>
                    {isToday ? null : (
                      <Tooltip label="今日へ戻る" withArrow>
                        <ActionIcon
                          aria-label="今日へ戻る"
                          onClick={() => void navigate({ to: "/" })}
                          size="input-sm"
                          variant="subtle"
                        >
                          <IconRefresh aria-hidden size={18} stroke={1.75} />
                        </ActionIcon>
                      </Tooltip>
                    )}
                  </Group>
                </Input.Wrapper>
                <Text c="dimmed" size="sm">
                  <BoardKanbanCrossLink dateJst={dateJst} todayJst={todayJst} />
                </Text>
              </Group>
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
                    onRemove={interactive ? onRemoveRow : () => {}}
                    onSkip={interactive ? onSkip : () => {}}
                    onUnskip={interactive ? onUnskip : () => {}}
                    row={row}
                  />
                </Box>
              ) : (
                <RowEditor
                  key={row._id}
                  disabled={!canEdit || !interactive}
                  onConfirm={interactive ? onConfirm : () => {}}
                  onRemove={interactive ? onRemoveRow : () => {}}
                  onSkip={interactive ? onSkip : () => {}}
                  onUnskip={interactive ? onUnskip : () => {}}
                  row={row}
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
