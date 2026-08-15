import { Button, Card, Grid, Select, Stack, Text, Title } from "@mantine/core";

import type { ItemDto, PresetDto } from "~/features/catalog/types/item";
import { parsePresetId } from "~/features/catalog/types/item";
import { AdhocRowForm } from "~/features/today/components/adhoc-row-form";
import { DayMetaPanel } from "~/features/today/components/day-meta-panel";
import { RowEditor } from "~/features/today/components/row-editor";
import { ShareCopy } from "~/features/today/components/share-copy";
import { TonightPanel } from "~/features/today/components/tonight-panel";
import type { DayPage, DayRow } from "~/features/today/types/day";
import { onRequiredSelect } from "~/lib/select";
import { BODY_FONT, DISPLAY_FONT } from "~/lib/theme";

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
    <Grid gap="md">
      <Grid.Col span={12}>
        <Card>
          <Grid align="end">
            <Grid.Col span={{ base: 12, sm: 7 }}>
              <Text c="dimmed" fw={600} size="xs" tt="uppercase">
                {isToday ? "今日" : "日"}
              </Text>
              <Title order={1}>{dateJst}</Title>
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 5 }}>
              <Text c="dimmed" size="sm">
                学習量
              </Text>
              <Title ff={DISPLAY_FONT} fw={500} lh={1} order={1}>
                {day.volumeMinutes}
                <Text c="dimmed" ff={BODY_FONT} fz="lg" span>
                  分
                </Text>
              </Title>
            </Grid.Col>
          </Grid>
        </Card>
      </Grid.Col>
      <Grid.Col span={{ base: 12, md: 8 }}>
        <Card>
          <Stack gap="md">
            <Title order={2}>行</Title>
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
          </Stack>
        </Card>
      </Grid.Col>
      <Grid.Col span={{ base: 12, md: 4 }}>
        <Stack gap="md">
          {isToday ? (
            <Card>
              <Stack gap="sm">
                <Title order={3}>プリセット</Title>
                <Select
                  aria-label="今日のプリセット切替"
                  data={presets.map((preset) => ({ label: preset.name, value: preset._id }))}
                  label="今日の雛形"
                  onChange={onRequiredSelect((value) => {
                    onSwitchPreset(parsePresetId(value));
                  })}
                  placeholder="切り替える"
                  value={null}
                />
              </Stack>
            </Card>
          ) : null}
          {canEdit ? (
            <Card>
              <TonightPanel
                onSaveBed={onSaveBed}
                onSaveWake={onSaveWake}
                showBed={isToday}
                sleepHours={day.day?.sleepHours ?? null}
                sleepWarning={day.day?.sleepWarning ?? false}
                tonightBedHm={day.tonightBedHm}
                wakeHm={day.day?.wakeHm ?? null}
              />
            </Card>
          ) : null}
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
      </Grid.Col>
    </Grid>
  );
}
