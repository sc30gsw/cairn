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
  NumberInput,
  Select,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { IconTemplate, IconTrash } from "@tabler/icons-react";
import { useEffect, type ReactNode } from "react";
import { WEEKDAYS, WEEKDAY_NAMES, isWeekday, type Weekday } from "~domain/catalog";

import { ConcreteActionFieldWithSuggestions } from "~/components/concrete-action-field-with-suggestions";
import { ConcreteActionTour, ConcreteActionTourTrigger } from "~/components/concrete-action-tour";
import { CONCRETE_ACTION_TOUR_TARGETS } from "~/components/concrete-action-tour-targets";
import { LabelAlignedCell } from "~/components/label-aligned-cell";
import { PageTitle } from "~/components/page-title";
import {
  useCatalogPresetActions,
  type CatalogPresetActions,
} from "~/features/catalog/hooks/use-catalog-preset-actions";
import { presetsRoute } from "~/features/catalog/lib/preset-route-api";
import { CreatePresetSchema, PresetSchema } from "~/features/catalog/schemas/preset-schema";
import type { PresetLineInput } from "~/features/catalog/schemas/preset-schema";
import { weekdayFromSelect } from "~/features/catalog/schemas/weekday-schema";
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

function weekdaySelectOptions(weekdays: readonly Weekday[]) {
  return weekdays.map((value) => ({
    label: WEEKDAY_NAMES[value],
    value: String(value),
  }));
}

const WEEKDAY_OPTIONS = weekdaySelectOptions(WEEKDAYS);

function presetEditorInitialInput(preset: PresetDto) {
  return {
    lines: preset.lines.map((line: PresetLineDto) => ({
      content: line.content,
      itemId: line.itemId as string,
      minutes: line.minutes,
    })),
    name: preset.name,
    weekday: preset.weekday,
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
  const taken = new Set(presets.map((preset) => preset.weekday));
  return WEEKDAYS.filter((weekday) => !taken.has(weekday));
}

function removeLineLabel(items: ItemDto[], itemId: string | undefined) {
  const name = items.find((item) => item._id === itemId)?.name ?? "項目";
  return `「${name}」を外す`;
}

export function PresetList({ items, presets, settingsCard }: PresetListProps) {
  const { onCreate, onRemove, onUpdate } = useCatalogPresetActions();
  const { weekday: focusWeekday } = presetsRoute.useSearch();
  const createFormKey = [...presets]
    .map((preset) => preset.weekday)
    .sort((left, right) => left - right)
    .join(",");
  const focusedPresetId =
    focusWeekday === undefined
      ? presets[0]?._id
      : presets.find((preset) => preset.weekday === focusWeekday)?._id;

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
                id={isWeekday(preset.weekday) ? presetWeekdayHash(preset.weekday) : undefined}
                key={preset._id}
                value={preset._id}
              >
                <Accordion.Control>
                  <Stack gap={2}>
                    <Text fw={600}>{preset.name}</Text>
                    <Text c="dimmed" size="sm">
                      {isWeekday(preset.weekday) ? WEEKDAY_NAMES[preset.weekday] : undefined}
                      {" · "}
                      {preset.lines.length === 0
                        ? "記録なし"
                        : preset.lines.map((line: PresetLineDto) => line.itemName).join("、")}
                    </Text>
                  </Stack>
                </Accordion.Control>
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
  const weekdayOptions = weekdaySelectOptions(remainingWeekdays);
  const onlyWeekday = remainingWeekdays.length === 1 ? remainingWeekdays[0] : undefined;
  const form = useForm({
    initialInput: {
      name: "",
      weekday: onlyWeekday,
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
            weekday: output.weekday,
          });
        }}
      >
        <Grid align="flex-start" gap="sm">
          <Grid.Col span={{ base: 12, sm: 6 }}>
            <Field of={form} path={["name"]}>
              {(field) => (
                <TextInput
                  {...field.props}
                  error={field.errors?.[0]}
                  label="プリセット名"
                  value={field.input}
                />
              )}
            </Field>
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 4 }}>
            <Field of={form} path={["weekday"]}>
              {(field) => (
                <Select
                  {...field.props}
                  data={weekdayOptions}
                  error={field.errors?.[0]}
                  label="曜日"
                  placeholder="曜日を選ぶ"
                  onChange={onRequiredSelect((value) => {
                    const weekday = weekdayFromSelect(value);
                    if (weekday !== undefined) {
                      field.onChange(weekday);
                    }
                  })}
                  value={field.input === undefined ? null : String(field.input)}
                />
              )}
            </Field>
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 2 }}>
            <LabelAlignedCell>
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
}: {
  items: ItemDto[];
  onRemove: CatalogPresetActions["onRemove"];
  onUpdate: CatalogPresetActions["onUpdate"];
  preset: PresetDto;
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
            weekday: output.weekday,
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
                    error={field.errors?.[0]}
                    label="名前"
                    value={field.input}
                  />
                )}
              </Field>
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 3 }}>
              <Field of={form} path={["weekday"]}>
                {(field) => (
                  <Select
                    {...field.props}
                    aria-label={`${preset.name}の曜日`}
                    data={WEEKDAY_OPTIONS}
                    error={field.errors?.[0]}
                    label=" "
                    onChange={onRequiredSelect((value) => {
                      const weekday = weekdayFromSelect(value);
                      if (weekday !== undefined) {
                        field.onChange(weekday);
                      }
                    })}
                    value={String(field.input)}
                  />
                )}
              </Field>
            </Grid.Col>
            <Grid.Col span={{ base: 6, sm: 3 }}>
              <LabelAlignedCell>
                <Button fullWidth type="submit">
                  {preset.name}を保存
                </Button>
              </LabelAlignedCell>
            </Grid.Col>
            <Grid.Col span={{ base: 6, sm: 2 }}>
              <LabelAlignedCell>
                <Button
                  color="red"
                  fullWidth
                  onClick={() => onRemove(preset._id)}
                  type="button"
                  variant="subtle"
                >
                  {preset.name}を削除
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
