import { Button, NativeSelect, Stack, Text, Title } from "@mantine/core";

import type { ItemDto, PresetDto } from "~/features/catalog/types/item";
import { parsePresetId } from "~/features/catalog/types/item";
import { AdhocRowForm } from "~/features/today/components/adhoc-row-form";
import { DayMetaPanel } from "~/features/today/components/day-meta-panel";
import { RowEditor } from "~/features/today/components/row-editor";
import { ShareCopy } from "~/features/today/components/share-copy";
import { TonightPanel } from "~/features/today/components/tonight-panel";
import type { DayPage, DayRow } from "~/features/today/types/day";

type DayBoardProps = {
  dateJst: string;
  day: DayPage;
  isToday: boolean;
  items: ItemDto[];
  onAddRow: (input: { content: string; itemId: ItemDto["_id"]; minutes: number }) => void;
  onConfirm: (input: { content: string; minutes: number; rowId: DayRow["_id"] }) => void;
  onRemoveDay: () => void;
  onRemoveRow: (rowId: DayRow["_id"]) => void;
  onSaveBed: (bedHm: string) => void;
  onSaveCondition: (condition: "好調" | "普通" | "崩れた") => void;
  onSaveMemo: (memo: string) => void;
  onSaveWake: (wakeHm: string) => void;
  onSkip: (rowId: DayRow["_id"]) => void;
  onSwitchPreset: (presetId: PresetDto["_id"]) => void;
  presets: PresetDto[];
};

export function DayBoard({
  dateJst,
  day,
  isToday,
  items,
  onAddRow,
  onConfirm,
  onRemoveDay,
  onRemoveRow,
  onSaveBed,
  onSaveCondition,
  onSaveMemo,
  onSaveWake,
  onSkip,
  onSwitchPreset,
  presets,
}: DayBoardProps) {
  const canEdit = !day.isFuture;

  return (
    <Stack gap="lg">
      <Title order={1}>{dateJst}</Title>
      <Text>学習量 {day.volumeMinutes}分</Text>
      {day.rows.map((row) => (
        <RowEditor
          key={row._id}
          disabled={!canEdit}
          onConfirm={onConfirm}
          onRemove={onRemoveRow}
          onSkip={onSkip}
          row={row}
        />
      ))}
      {day.rows.length === 0 ? <Text c="dimmed">この日の行はありません。</Text> : null}
      {canEdit ? <AdhocRowForm items={items} onAdd={onAddRow} /> : null}
      {isToday ? (
        <NativeSelect
          aria-label="今日のプリセット切替"
          data={[
            { label: "プリセットを切り替える", value: "" },
            ...presets.map((preset) => ({ label: preset.name, value: preset._id })),
          ]}
          onChange={(event) => {
            const value = event.currentTarget.value;
            if (value !== "") {
              onSwitchPreset(parsePresetId(value));
            }
          }}
        />
      ) : null}
      {canEdit ? (
        <TonightPanel
          onSaveBed={onSaveBed}
          onSaveWake={onSaveWake}
          showBed={isToday}
          sleepHours={day.day?.sleepHours ?? null}
          sleepWarning={day.day?.sleepWarning ?? false}
          tonightBedHm={day.tonightBedHm}
          wakeHm={day.day?.wakeHm ?? null}
        />
      ) : null}
      {canEdit ? (
        <DayMetaPanel
          condition={day.day?.condition ?? null}
          memo={day.day?.memo ?? null}
          onSaveCondition={onSaveCondition}
          onSaveMemo={onSaveMemo}
        />
      ) : null}
      <ShareCopy markdown={day.shareMarkdown} />
      {canEdit && day.day !== null ? (
        <Button color="red" onClick={onRemoveDay} variant="light">
          この日をゴミ箱へ
        </Button>
      ) : null}
    </Stack>
  );
}
