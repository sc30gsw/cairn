import { Field, FieldArray, Form, insert, remove, reset, useField, useForm } from "@formisch/react";
import {
  Accordion,
  ActionIcon,
  Box,
  Button,
  Card,
  EmptyState,
  Grid,
  Group,
  Input,
  MultiSelect,
  NumberInput,
  Select,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { IconTemplate, IconTrash } from "@tabler/icons-react";
import { useEffect, type ReactNode } from "react";
import { WEEKDAYS, WEEKDAY_NAMES, type Weekday } from "~domain/catalog";

import { ConcreteActionFieldWithSuggestions } from "~/components/concrete-action-field-with-suggestions";
import { ConcreteActionTour, ConcreteActionTourTrigger } from "~/components/concrete-action-tour";
import { CONCRETE_ACTION_TOUR_TARGETS } from "~/components/concrete-action-tour-targets";
import { LabelAlignedCell } from "~/components/label-aligned-cell";
import { OverflowTooltip } from "~/components/overflow-tooltip";
import { PageTitle } from "~/components/page-title";
import {
  useCatalogPresetActions,
  type CatalogPresetActions,
} from "~/features/catalog/hooks/use-catalog-preset-actions";
import { presetsRoute } from "~/features/catalog/lib/preset-route-api";
import { CreatePresetSchema, PresetSchema } from "~/features/catalog/schemas/preset-schema";
import type { PresetLineInput } from "~/features/catalog/schemas/preset-schema";
import { presetWeekdayHash } from "~/lib/preset-weekday-hash";
import { onRequiredSelect } from "~/lib/select";
import type { ItemDto, PresetDto } from "~/types/item";
import { parseItemId, unwrapItemId } from "~/types/item";

type PresetLineDto = PresetDto["lines"][number];

type PresetListProps = {
  items: ItemDto[];
  presets: PresetDto[];
  settingsCard?: ReactNode;
};

const EMPTY_FIELD_DESCRIPTION = <span aria-hidden="true">&nbsp;</span>;

function weekdaySelectOptions(takenWeekdays: ReadonlySet<Weekday>) {
  return WEEKDAYS.map((value) => ({
    disabled: takenWeekdays.has(value),
    label: takenWeekdays.has(value) ? `${WEEKDAY_NAMES[value]}（使用中）` : WEEKDAY_NAMES[value],
    value: String(value),
  }));
}

function sortedWeekdayValues(values: string[]) {
  return values.slice().sort((left, right) => Number(left) - Number(right));
}

function presetEditorInitialInput(preset: PresetDto) {
  return {
    lines: preset.lines.map((line: PresetLineDto) => ({
      content: line.content,
      itemId: line.itemId as string,
      minutes: line.minutes,
    })),
    name: preset.name,
    weekdays: preset.weekdays.map(String),
  };
}

function parsedLines(lines: PresetLineInput[]) {
  return lines.map((line) => ({
    content: line.content,
    itemId: unwrapItemId(parseItemId(line.itemId)),
    minutes: line.minutes,
  }));
}

function itemOptions(items: ItemDto[]) {
  return items.map((item) => ({ label: item.name, value: item._id }));
}

function availableItemOptions(
  items: ItemDto[],
  lines: readonly Partial<PresetLineInput>[],
  currentIndex: number,
) {
  const taken = new Set<string>();
  for (const [index, line] of lines.entries()) {
    if (index !== currentIndex && line.itemId !== undefined) {
      taken.add(line.itemId);
    }
  }
  return itemOptions(items.filter((item) => !taken.has(item._id)));
}

function firstAvailableItem(items: ItemDto[], lines: readonly Partial<PresetLineInput>[]) {
  const taken = new Set(lines.map((line) => line.itemId));
  return items.find((item) => !taken.has(item._id));
}

function availableWeekdays(presets: PresetDto[]): Weekday[] {
  const taken = new Set(presets.flatMap((preset) => preset.weekdays));
  return WEEKDAYS.filter((weekday) => !taken.has(weekday));
}

function takenWeekdays(presets: PresetDto[], currentPresetId?: PresetDto["_id"]) {
  const taken = new Set<Weekday>();
  for (const preset of presets) {
    if (preset._id === currentPresetId) continue;
    for (const weekday of preset.weekdays) taken.add(weekday);
  }
  return taken;
}

function removeLineLabel(items: ItemDto[], itemId: string | undefined) {
  const name = items.find((item) => item._id === itemId)?.name ?? "項目";
  return `「${name}」を外す`;
}

function presetSummary(preset: PresetDto): string {
  const weekdays = preset.weekdays.map((weekday: Weekday) => WEEKDAY_NAMES[weekday]).join("・");
  const items =
    preset.lines.length === 0
      ? "記録なし"
      : preset.lines.map((line: PresetLineDto) => line.itemName).join("、");
  return `${weekdays || "曜日未設定"} · ${items}`;
}

function presetAnchorId(preset: PresetDto, focusWeekday: Weekday | undefined) {
  const weekday =
    focusWeekday !== undefined && preset.weekdays.includes(focusWeekday)
      ? focusWeekday
      : preset.weekdays[0];
  return weekday === undefined ? undefined : presetWeekdayHash(weekday);
}

export function PresetList({ items, presets, settingsCard }: PresetListProps) {
  const { onCreate, onRemove, onUpdate } = useCatalogPresetActions();
  const { weekday: focusWeekday } = presetsRoute.useSearch();
  const createFormKey = [...presets]
    .flatMap((preset) => preset.weekdays)
    .sort((left, right) => left - right)
    .join(",");
  const focusedPresetId =
    focusWeekday === undefined
      ? presets[0]?._id
      : presets.find((preset) => preset.weekdays.includes(focusWeekday))?._id;

  return (
    <ConcreteActionTour screen="presets">
      <Stack gap="md">
        <Group gap="xs" wrap="nowrap">
          <PageTitle>プリセット</PageTitle>
          <ConcreteActionTourTrigger />
        </Group>
        {settingsCard}
        <PresetCreateForm key={createFormKey} onCreate={onCreate} presets={presets} />
        {presets.length === 0 ? (
          <EmptyState
            description="よく使う手順をプリセットにすると、記録から呼び出せます。"
            icon={<IconTemplate aria-hidden />}
            title="プリセットはまだありません"
          />
        ) : (
          <Accordion
            defaultValue={focusedPresetId}
            key={focusWeekday === undefined ? "default" : String(focusWeekday)}
            variant="separated"
          >
            {presets.map((preset) => (
              <Accordion.Item
                id={presetAnchorId(preset, focusWeekday)}
                key={preset._id}
                value={preset._id}
              >
                <OverflowTooltip<HTMLButtonElement>
                  content={`${preset.name}\n${presetSummary(preset)}`}
                >
                  {(ref) => (
                    <Accordion.Control ref={ref}>
                      <Stack gap={2} miw={0}>
                        <Text fw={600} lineClamp={1}>
                          {preset.name}
                        </Text>
                        <Text c="dimmed" lineClamp={2} size="sm">
                          {presetSummary(preset)}
                        </Text>
                      </Stack>
                    </Accordion.Control>
                  )}
                </OverflowTooltip>
                <Accordion.Panel>
                  <Box
                    data-onboarding-tour-id={
                      preset._id === presets[0]?._id
                        ? CONCRETE_ACTION_TOUR_TARGETS.presets
                        : undefined
                    }
                  >
                    <PresetEditor
                      items={items}
                      onRemove={onRemove}
                      onUpdate={onUpdate}
                      preset={preset}
                      presets={presets}
                    />
                  </Box>
                </Accordion.Panel>
              </Accordion.Item>
            ))}
          </Accordion>
        )}
      </Stack>
    </ConcreteActionTour>
  );
}

function PresetCreateForm({
  onCreate,
  presets,
}: {
  onCreate: CatalogPresetActions["onCreate"];
  presets: PresetDto[];
}) {
  const remainingWeekdays = availableWeekdays(presets);
  const weekdayOptions = weekdaySelectOptions(takenWeekdays(presets));
  const onlyWeekday = remainingWeekdays.length === 1 ? remainingWeekdays[0] : undefined;
  const form = useForm({
    initialInput: {
      name: "",
      weekdays: onlyWeekday === undefined ? [] : [String(onlyWeekday)],
    },
    schema: CreatePresetSchema,
  });

  if (remainingWeekdays.length === 0) {
    return (
      <Card>
        <Text c="dimmed">すべての曜日にプリセットがあります。</Text>
      </Card>
    );
  }

  return (
    <Card>
      <Form
        of={form}
        onSubmit={(output) => {
          onCreate({
            lines: [],
            name: output.name,
            weekdays: output.weekdays,
          });
        }}
      >
        <Grid align="flex-start" gap="sm">
          <Grid.Col span={{ base: 12, sm: 5 }}>
            <Field of={form} path={["name"]}>
              {(field) => (
                <TextInput
                  {...field.props}
                  description={EMPTY_FIELD_DESCRIPTION}
                  error={field.errors?.[0]}
                  label="プリセット名"
                  value={field.input}
                />
              )}
            </Field>
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 5 }}>
            <Field of={form} path={["weekdays"]}>
              {(field) => (
                <MultiSelect
                  {...field.props}
                  clearable
                  data={weekdayOptions}
                  description="複数選択できます"
                  error={field.errors?.[0]}
                  label="曜日"
                  nothingFoundMessage="該当する曜日はありません"
                  onChange={(values) => field.onChange(sortedWeekdayValues(values))}
                  placeholder="曜日を選択"
                  searchable
                  value={field.input}
                />
              )}
            </Field>
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 2 }}>
            <LabelAlignedCell description={EMPTY_FIELD_DESCRIPTION}>
              <Button fullWidth type="submit">
                プリセットを追加
              </Button>
            </LabelAlignedCell>
          </Grid.Col>
        </Grid>
      </Form>
    </Card>
  );
}

function PresetEditor({
  items,
  onRemove,
  onUpdate,
  preset,
  presets,
}: {
  items: ItemDto[];
  onRemove: CatalogPresetActions["onRemove"];
  onUpdate: CatalogPresetActions["onUpdate"];
  preset: PresetDto;
  presets: PresetDto[];
}) {
  const form = useForm({
    initialInput: presetEditorInitialInput(preset),
    schema: PresetSchema,
  });
  const linesField = useField(form, { path: ["lines"] });
  const lines = linesField.input;

  useEffect(() => {
    if (form.isDirty) {
      return;
    }
    reset(form, { initialInput: presetEditorInitialInput(preset) });
  }, [form, preset]);

  return (
    <Card p="md" withBorder={false}>
      <Form
        of={form}
        onSubmit={(output) => {
          onUpdate({
            lines: parsedLines(output.lines),
            name: output.name,
            presetId: preset._id,
            weekdays: output.weekdays,
          });
        }}
      >
        <Stack gap="sm">
          <Grid align="flex-start" gap="sm">
            <Grid.Col span={{ base: 12, sm: 4 }}>
              <Field of={form} path={["name"]}>
                {(field) => (
                  <TextInput
                    {...field.props}
                    aria-label={`${preset.name}の新しい名前`}
                    description={EMPTY_FIELD_DESCRIPTION}
                    error={field.errors?.[0]}
                    label="名前"
                    value={field.input}
                  />
                )}
              </Field>
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 4 }}>
              <Field of={form} path={["weekdays"]}>
                {(field) => (
                  <MultiSelect
                    {...field.props}
                    clearable
                    aria-label={`${preset.name}の曜日`}
                    data={weekdaySelectOptions(takenWeekdays(presets, preset._id))}
                    description="複数選択できます"
                    error={field.errors?.[0]}
                    label="曜日"
                    nothingFoundMessage="該当する曜日はありません"
                    onChange={(values) => field.onChange(sortedWeekdayValues(values))}
                    placeholder="曜日を選択"
                    searchable
                    value={field.input}
                  />
                )}
              </Field>
            </Grid.Col>
            <Grid.Col span={{ base: 6, sm: 2 }}>
              <LabelAlignedCell description={EMPTY_FIELD_DESCRIPTION}>
                <Button aria-label={`${preset.name}を保存`} fullWidth type="submit">
                  保存
                </Button>
              </LabelAlignedCell>
            </Grid.Col>
            <Grid.Col span={{ base: 6, sm: 2 }}>
              <LabelAlignedCell description={EMPTY_FIELD_DESCRIPTION}>
                <Button
                  aria-label={`${preset.name}を削除`}
                  color="red"
                  fullWidth
                  onClick={() => onRemove(preset._id)}
                  type="button"
                  variant="subtle"
                >
                  削除
                </Button>
              </LabelAlignedCell>
            </Grid.Col>
          </Grid>
          <FieldArray of={form} path={["lines"]}>
            {(fieldArray) => (
              <Stack gap="sm">
                {fieldArray.items.map((itemKey, index) => {
                  const lineItemId = lines?.[index]?.itemId;
                  const removeLabel = removeLineLabel(items, lineItemId);
                  const itemName = items.find((item) => item._id === lineItemId)?.name;
                  return (
                    <Grid key={itemKey} align="flex-start" gap="sm">
                      <Grid.Col span={{ base: 12, sm: 4 }}>
                        <Field of={form} path={["lines", index, "itemId"]}>
                          {(field) => (
                            <Select
                              {...field.props}
                              aria-label={`${preset.name}の雛形${index + 1}の項目`}
                              data={availableItemOptions(items, lines ?? [], index)}
                              error={field.errors?.[0]}
                              label={index === 0 ? "項目" : undefined}
                              onChange={onRequiredSelect((value) => {
                                field.onChange(value);
                              })}
                              searchable
                              value={field.input}
                            />
                          )}
                        </Field>
                      </Grid.Col>
                      <Grid.Col span={{ base: 12, sm: 4 }}>
                        <Field of={form} path={["lines", index, "content"]}>
                          {(field) => (
                            <ConcreteActionFieldWithSuggestions
                              {...field.props}
                              aria-label={`${preset.name}の雛形${index + 1}のひとこと`}
                              error={field.errors?.[0]}
                              itemId={unwrapItemId(parseItemId(lineItemId ?? ""))}
                              itemName={itemName}
                              label={index === 0 ? "ひとこと" : undefined}
                              onValueChange={(value) => field.onChange(value)}
                              value={field.input}
                              wrapLabel={false}
                            />
                          )}
                        </Field>
                      </Grid.Col>
                      <Grid.Col span={{ base: 6, sm: 2 }}>
                        <Field of={form} path={["lines", index, "minutes"]}>
                          {(field) => (
                            <NumberInput
                              {...field.props}
                              aria-label={`${preset.name}の雛形${index + 1}の分数`}
                              error={field.errors?.[0]}
                              label={index === 0 ? "分数" : undefined}
                              min={0}
                              onChange={(value) =>
                                field.onChange(typeof value === "number" ? value : 0)
                              }
                              value={field.input}
                            />
                          )}
                        </Field>
                      </Grid.Col>
                      <Grid.Col span={{ base: 6, sm: 2 }}>
                        <Input.Wrapper label={index === 0 ? " " : undefined}>
                          <Tooltip label={removeLabel}>
                            <ActionIcon
                              aria-label={removeLabel}
                              color="red"
                              onClick={() => {
                                remove(form, { at: index, path: ["lines"] });
                              }}
                              size="lg"
                              type="button"
                              variant="white"
                            >
                              <IconTrash aria-hidden size={16} stroke={1.5} />
                            </ActionIcon>
                          </Tooltip>
                        </Input.Wrapper>
                      </Grid.Col>
                    </Grid>
                  );
                })}
              </Stack>
            )}
          </FieldArray>
          <Button
            disabled={firstAvailableItem(items, lines ?? []) === undefined}
            onClick={() => {
              const next = firstAvailableItem(items, lines ?? []);
              if (next === undefined) {
                return;
              }
              insert(form, {
                initialInput: { content: "", itemId: next._id, minutes: 20 },
                path: ["lines"],
              });
            }}
            type="button"
            variant="light"
          >
            雛形を足す
          </Button>
        </Stack>
      </Form>
    </Card>
  );
}
