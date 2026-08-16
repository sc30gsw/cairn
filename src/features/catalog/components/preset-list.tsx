import { Field, FieldArray, Form, insert, remove, useField, useForm } from "@formisch/react";
import {
  Accordion,
  ActionIcon,
  Box,
  Button,
  Card,
  Grid,
  Group,
  Input,
  NumberInput,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import { WEEKDAY_NAMES } from "~domain/catalog";

import { ConcreteActionFieldWithSuggestions } from "~/components/concrete-action-field-with-suggestions";
import { ConcreteActionTour, ConcreteActionTourTrigger } from "~/components/concrete-action-tour";
import { CONCRETE_ACTION_TOUR_TARGETS } from "~/components/concrete-action-tour-targets";
import { LabelAlignedCell } from "~/components/label-aligned-cell";
import { CreatePresetSchema, PresetSchema } from "~/features/catalog/schemas/preset-schema";
import type { PresetLineInput } from "~/features/catalog/schemas/preset-schema";
import type { ItemDto, ItemId, PresetDto } from "~/features/catalog/types/item";
import { parseItemId } from "~/features/catalog/types/item";
import type {
  CreatePresetInput,
  RemovePresetInput,
  UpdatePresetInput,
} from "~/features/catalog/types/mutations";
import { onRequiredSelect } from "~/lib/select";

type PresetLineDto = PresetDto["lines"][number];

type PresetListProps = {
  items: ItemDto[];
  onCreate: (input: CreatePresetInput) => void;
  onRemove: (presetId: RemovePresetInput["presetId"]) => void;
  onUpdate: (input: UpdatePresetInput) => void;
  presets: PresetDto[];
};

const WEEKDAY_OPTIONS = WEEKDAY_NAMES.map((label, value) => ({
  label,
  value: String(value),
}));

function parsedLines(lines: PresetLineInput[]) {
  return lines.map((line) => ({
    content: line.content,
    itemId: parseItemId(line.itemId),
    minutes: line.minutes,
  }));
}

function itemOptions(items: ItemDto[]) {
  return items.map((item) => ({ label: item.name, value: item._id }));
}

//? lines はフォーム状態(PartialValues)から渡されるため、各フィールドは undefined になりうる
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

function availableWeekdayOptions(presets: PresetDto[]) {
  const taken = new Set(presets.map((preset) => preset.weekday));
  return WEEKDAY_OPTIONS.filter((option) => !taken.has(Number(option.value)));
}

function removeLineLabel(items: ItemDto[], itemId: string | undefined) {
  const name = items.find((item) => item._id === itemId)?.name ?? "項目";
  return `「${name}」を外す`;
}

export function PresetList({ items, onCreate, onRemove, onUpdate, presets }: PresetListProps) {
  const createFormKey = [...presets]
    .map((preset) => preset.weekday)
    .sort((left, right) => left - right)
    .join(",");

  return (
    <ConcreteActionTour screen="presets">
      <Stack gap="md">
        <Group gap="xs" wrap="nowrap">
          <Title order={1}>プリセット</Title>
          <ConcreteActionTourTrigger />
        </Group>
        <PresetCreateForm key={createFormKey} onCreate={onCreate} presets={presets} />
        {presets.length === 0 ? (
          <Text c="dimmed">プリセットはまだありません。</Text>
        ) : (
          <Accordion defaultValue={presets[0]?._id} variant="separated">
            {presets.map((preset) => (
              <Accordion.Item key={preset._id} value={preset._id}>
                <Accordion.Control>
                  <Stack gap={2}>
                    <Text fw={600}>{preset.name}</Text>
                    <Text c="dimmed" size="sm">
                      {
                        WEEKDAY_OPTIONS.find((option) => option.value === String(preset.weekday))
                          ?.label
                      }
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
  onCreate: PresetListProps["onCreate"];
  presets: PresetDto[];
}) {
  const weekdayOptions = availableWeekdayOptions(presets);
  const defaultWeekday = weekdayOptions.length === 1 ? Number(weekdayOptions[0]?.value) : null;
  const form = useForm({
    initialInput: {
      name: "",
      weekday: defaultWeekday,
    },
    schema: CreatePresetSchema,
  });

  if (weekdayOptions.length === 0) {
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
          const weekday = output.weekday;
          if (weekday === null) {
            return;
          }
          onCreate({
            lines: [],
            name: output.name,
            weekday,
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
                    field.onChange(Number(value));
                  })}
                  value={field.input === null ? null : String(field.input)}
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
  onRemove: PresetListProps["onRemove"];
  onUpdate: PresetListProps["onUpdate"];
  preset: PresetDto;
}) {
  //? 雛形行もフォーム状態(PresetSchema)が SSoT。行単位のエラーは Field の errors で表示する(formisch.md)
  const form = useForm({
    initialInput: {
      lines: preset.lines.map((line: PresetLineDto) => ({
        content: line.content,
        itemId: line.itemId as string,
        minutes: line.minutes,
      })),
      name: preset.name,
      weekday: preset.weekday,
    },
    schema: PresetSchema,
  });
  const linesField = useField(form, { path: ["lines"] });
  const lines = linesField.input;

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
                      field.onChange(Number(value));
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
                              aria-label={`${preset.name}の雛形${index + 1}の具体的手順`}
                              error={field.errors?.[0]}
                              //? itemId は Select の選択肢由来で常に有効な項目 id(firstAvailableItem で補充)。parseItemId の実行時ガードは submit 時のみ必要
                              itemId={lineItemId as ItemId}
                              itemName={itemName}
                              onValueChange={(value) => field.onChange(value)}
                              value={field.input}
                              wrapLabel={index === 0}
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
