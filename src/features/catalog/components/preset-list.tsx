import { Field, Form, useForm } from "@formisch/react";
import {
  Accordion,
  ActionIcon,
  Button,
  Card,
  Grid,
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
import { useState } from "react";
import * as v from "valibot";
import { WEEKDAY_NAMES } from "~domain/catalog";

import { CreatePresetSchema, PresetSchema } from "~/features/catalog/schemas/preset-schema";
import type { ItemDto, PresetDto } from "~/features/catalog/types/item";
import { parseItemId } from "~/features/catalog/types/item";
import { onRequiredSelect } from "~/lib/select";

type PresetLineDraft = {
  content: string;
  itemId: string;
  minutes: number;
};

type PresetLineDto = {
  content: string;
  itemId: ItemDto["_id"];
  itemName: string;
  minutes: number;
};

type PresetListProps = {
  items: ItemDto[];
  onCreate: (input: {
    lines: { content: string; itemId: ItemDto["_id"]; minutes: number }[];
    name: string;
    weekday: number;
  }) => void;
  onRemove: (presetId: PresetDto["_id"]) => void;
  onUpdate: (input: {
    lines: { content: string; itemId: ItemDto["_id"]; minutes: number }[];
    name: string;
    presetId: PresetDto["_id"];
    weekday: number;
  }) => void;
  presets: PresetDto[];
};

const WEEKDAY_OPTIONS = WEEKDAY_NAMES.map((label, value) => ({
  label,
  value: String(value),
}));

function parsedLines(lines: PresetLineDraft[]) {
  return lines.map((line) => ({
    content: line.content,
    itemId: parseItemId(line.itemId),
    minutes: line.minutes,
  }));
}

function itemOptions(items: ItemDto[]) {
  return items.map((item) => ({ label: item.name, value: item._id }));
}

function availableItemOptions(items: ItemDto[], lines: PresetLineDraft[], currentIndex: number) {
  const taken = new Set<string>();
  for (const [index, line] of lines.entries()) {
    if (index !== currentIndex) {
      taken.add(line.itemId);
    }
  }
  return itemOptions(items.filter((item) => !taken.has(item._id)));
}

function firstAvailableItem(items: ItemDto[], lines: PresetLineDraft[]) {
  const taken = new Set(lines.map((line) => line.itemId));
  return items.find((item) => !taken.has(item._id));
}

function availableWeekdayOptions(presets: PresetDto[]) {
  const taken = new Set(presets.map((preset) => preset.weekday));
  return WEEKDAY_OPTIONS.filter((option) => !taken.has(Number(option.value)));
}

function removeLineLabel(items: ItemDto[], itemId: string) {
  const name = items.find((item) => item._id === itemId)?.name ?? "項目";
  return `「${name}」を外す`;
}

export function PresetList({ items, onCreate, onRemove, onUpdate, presets }: PresetListProps) {
  const createFormKey = [...presets]
    .map((preset) => preset.weekday)
    .sort((left, right) => left - right)
    .join(",");

  return (
    <Stack gap="md">
      <Title order={1}>プリセット</Title>
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
                <PresetEditor
                  items={items}
                  onRemove={onRemove}
                  onUpdate={onUpdate}
                  preset={preset}
                />
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>
      )}
    </Stack>
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
        <Grid align="flex-end" gap="sm">
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
            <Button fullWidth type="submit">
              プリセットを追加
            </Button>
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
  const [lines, setLines] = useState<PresetLineDraft[]>(() =>
    preset.lines.map((line: PresetLineDto) => ({
      content: line.content,
      itemId: line.itemId,
      minutes: line.minutes,
    })),
  );
  const form = useForm({
    initialInput: {
      lines: preset.lines.map((line: PresetLineDto) => ({
        content: line.content,
        itemId: line.itemId,
        minutes: line.minutes,
      })),
      name: preset.name,
      weekday: preset.weekday,
    },
    schema: PresetSchema,
  });

  return (
    <Card p="md" withBorder={false}>
      <Form
        of={form}
        onSubmit={(output) => {
          const parsed = v.parse(PresetSchema, { ...output, lines });
          onUpdate({
            lines: parsedLines(parsed.lines),
            name: parsed.name,
            presetId: preset._id,
            weekday: parsed.weekday,
          });
        }}
      >
        <Stack gap="sm">
          <Grid align="flex-end" gap="sm">
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
                    onChange={onRequiredSelect((value) => {
                      field.onChange(Number(value));
                    })}
                    value={String(field.input)}
                  />
                )}
              </Field>
            </Grid.Col>
            <Grid.Col span={{ base: 6, sm: 3 }}>
              <Button fullWidth type="submit">
                {preset.name}を保存
              </Button>
            </Grid.Col>
            <Grid.Col span={{ base: 6, sm: 2 }}>
              <Button
                color="red"
                fullWidth
                onClick={() => onRemove(preset._id)}
                type="button"
                variant="subtle"
              >
                {preset.name}を削除
              </Button>
            </Grid.Col>
          </Grid>
          {lines.map((line, index) => {
            const removeLabel = removeLineLabel(items, line.itemId);
            return (
              <Grid key={`${preset._id}-${index}`} align="flex-end" gap="sm">
                <Grid.Col span={{ base: 12, sm: 4 }}>
                  <Select
                    aria-label={`${preset.name}の雛形${index + 1}の項目`}
                    data={availableItemOptions(items, lines, index)}
                    label={index === 0 ? "項目" : undefined}
                    onChange={onRequiredSelect((value) => {
                      setLines((current) =>
                        current.map((entry, entryIndex) =>
                          entryIndex === index ? { ...entry, itemId: value } : entry,
                        ),
                      );
                    })}
                    searchable
                    value={line.itemId}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 4 }}>
                  <TextInput
                    aria-label={`${preset.name}の雛形${index + 1}の内容`}
                    label={index === 0 ? "内容" : undefined}
                    onChange={(event) => {
                      const content = event.currentTarget.value;
                      setLines((current) =>
                        current.map((entry, entryIndex) =>
                          entryIndex === index ? { ...entry, content } : entry,
                        ),
                      );
                    }}
                    value={line.content}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 6, sm: 2 }}>
                  <NumberInput
                    aria-label={`${preset.name}の雛形${index + 1}の分数`}
                    label={index === 0 ? "分数" : undefined}
                    min={0}
                    onChange={(value) => {
                      const minutes = typeof value === "number" ? value : 0;
                      setLines((current) =>
                        current.map((entry, entryIndex) =>
                          entryIndex === index ? { ...entry, minutes } : entry,
                        ),
                      );
                    }}
                    value={line.minutes}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 6, sm: 2 }}>
                  <Input.Wrapper label={index === 0 ? " " : undefined}>
                    <Tooltip label={removeLabel}>
                      <ActionIcon
                        aria-label={removeLabel}
                        color="red"
                        onClick={() => {
                          setLines((current) =>
                            current.filter((_, entryIndex) => entryIndex !== index),
                          );
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
          <Button
            disabled={firstAvailableItem(items, lines) === undefined}
            onClick={() => {
              const next = firstAvailableItem(items, lines);
              if (next === undefined) {
                return;
              }
              setLines((current) => [...current, { content: "", itemId: next._id, minutes: 20 }]);
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
