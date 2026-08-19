import {
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
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { IconNotes } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import {
  addDaysJst,
  isDateJst,
  isFutureDateJst,
  weekdayFromDateJst,
  type DateJst,
} from "~domain/jst";

import { ConcreteActionTour, ConcreteActionTourTrigger } from "~/components/concrete-action-tour";
import { CONCRETE_ACTION_TOUR_TARGETS } from "~/components/concrete-action-tour-targets";
import type { ItemDto, PresetDto, PresetId } from "~/features/catalog/types/item";
import { parsePresetId } from "~/features/catalog/types/item";
import { AdhocRowForm } from "~/features/today/components/adhoc-row-form";
import { DayMetaPanel } from "~/features/today/components/day-meta-panel";
import { RowEditor } from "~/features/today/components/row-editor";
import { ShareCopy } from "~/features/today/components/share-copy";
import { emptyDayCopy } from "~/features/today/lib/empty-day-copy";
import type { DayPage } from "~/features/today/types/day";
import type {
  AddRowInput,
  ConfirmRowInput,
  RemoveRowInput,
  SetConditionInput,
  SetMemoInput,
  SkipRowInput,
} from "~/features/today/types/mutations";
import { calendarDayProps, calendarDayStyleClasses } from "~/lib/calendar-day-style";
import { onRequiredSelect } from "~/lib/select";
import { BODY_FONT, NUMERAL_FONT } from "~/lib/theme";

import classes from "~/features/today/components/day-board.module.css";

type DayBoardProps = {
  dateJst: DateJst;
  day: DayPage;
  items: ItemDto[];
  onAddRow: (input: AddRowInput) => void;
  onConfirm: (input: ConfirmRowInput) => void;
  onCopyYesterday: () => void;
  onRemoveDay: () => void;
  onRemoveRow: (rowId: RemoveRowInput["rowId"]) => void;
  onSaveCondition: (condition: SetConditionInput) => void;
  onSaveMemo: (memo: SetMemoInput) => void;
  onSkip: (rowId: SkipRowInput["rowId"]) => void;
  onSwitchPreset: (presetId: PresetDto["_id"]) => void;
  presets: PresetDto[];
  selectedPresetId: null | PresetId;
  todayJst: DateJst;
};

type DayPresetSelectProps = {
  dateJst: DateJst;
  onSwitchPreset: (presetId: PresetDto["_id"]) => void;
  presets: PresetDto[];
  selectedPresetId: null | PresetId;
};

export function weekdayPresetId(dateJst: DateJst, presets: PresetDto[]) {
  return presets.find((preset) => preset.weekday === weekdayFromDateJst(dateJst))?._id ?? null;
}

function DayPresetSelect({
  dateJst,
  onSwitchPreset,
  presets,
  selectedPresetId,
}: DayPresetSelectProps) {
  const navigate = useNavigate();
  const defaultPresetId = weekdayPresetId(dateJst, presets);

  return (
    <Select
      aria-label="プリセット切替"
      data={presets.map((preset) => ({ label: preset.name, value: preset._id }))}
      label="この日の雛形"
      onChange={onRequiredSelect((value) => {
        const presetId = parsePresetId(value);
        void navigate({
          to: ".",
          search: (current) => ({
            ...current,
            preset: presetId === defaultPresetId ? undefined : presetId,
          }),
        });
        onSwitchPreset(presetId);
      })}
      placeholder="切り替える"
      value={selectedPresetId ?? defaultPresetId}
    />
  );
}

export function DayBoard({
  dateJst,
  day,
  items,
  onAddRow,
  onConfirm,
  onCopyYesterday,
  onRemoveDay,
  onRemoveRow,
  onSaveCondition,
  onSaveMemo,
  onSkip,
  onSwitchPreset,
  presets,
  selectedPresetId,
  todayJst,
}: DayBoardProps) {
  const navigate = useNavigate();
  const canEdit = day.kind !== "unrecorded";
  const isToday = dateJst === todayJst;
  const emptyCopy = emptyDayCopy(day.kind);

  const goToDate = (next: string) => {
    if (!isDateJst(next) || isFutureDateJst(next, todayJst)) {
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
          <Grid align="end">
            <Grid.Col span={{ base: 12, sm: 7 }}>
              <Group align="flex-end" gap="sm" wrap="wrap">
                <Button
                  aria-label="前の日"
                  onClick={() => goToDate(addDaysJst(dateJst, -1))}
                  variant="subtle"
                >
                  前の日
                </Button>
                <DatePickerInput
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
                  label="学習日"
                  locale="ja"
                  maxDate={todayJst}
                  onChange={(value) => {
                    if (typeof value === "string") {
                      goToDate(value);
                    }
                  }}
                  popoverProps={{ withinPortal: true }}
                  value={dateJst}
                  valueFormat="YYYY-MM-DD"
                />
                <Button
                  aria-label="次の日"
                  disabled={dateJst >= todayJst}
                  onClick={() => goToDate(addDaysJst(dateJst, 1))}
                  variant="subtle"
                >
                  次の日
                </Button>
                {isToday ? null : (
                  <Button onClick={() => void navigate({ to: "/" })} variant="light">
                    今日へ戻る
                  </Button>
                )}
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
                dateJst={dateJst}
                onSwitchPreset={onSwitchPreset}
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
                    disabled={!canEdit}
                    onConfirm={onConfirm}
                    onRemove={onRemoveRow}
                    onSkip={onSkip}
                    row={row}
                  />
                </Box>
              ) : (
                <RowEditor
                  key={row._id}
                  disabled={!canEdit}
                  onConfirm={onConfirm}
                  onRemove={onRemoveRow}
                  onSkip={onSkip}
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
            {canEdit ? (
              <Button disabled={!day.canCopyYesterday} onClick={onCopyYesterday} variant="light">
                昨日の確定をコピー
              </Button>
            ) : null}
            {canEdit ? <AdhocRowForm items={items} onAdd={onAddRow} /> : null}
          </Stack>
        </Card>
        {canEdit ? (
          <Card>
            <DayMetaPanel
              condition={day.day?.condition ?? null}
              memo={day.day?.memo ?? null}
              onSaveCondition={onSaveCondition}
              onSaveMemo={onSaveMemo}
            />
          </Card>
        ) : null}
        <Card>
          <ShareCopy markdown={day.shareMarkdown} />
        </Card>
        {canEdit && day.day !== null ? (
          <Button color="red" onClick={onRemoveDay} variant="light">
            この日をゴミ箱へ
          </Button>
        ) : null}
      </Stack>
    </ConcreteActionTour>
  );
}
