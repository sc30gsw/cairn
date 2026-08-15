import { Field, Form, useForm } from "@formisch/react";
import {
  Button,
  Card,
  Grid,
  NumberInput,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useState } from "react";
import * as v from "valibot";
import { WEEKDAY_NAMES } from "~domain/catalog";

import { PresetSchema } from "~/features/catalog/schemas/preset-schema";
import type { ItemDto, PresetDto } from "~/features/catalog/types/item";
import { parseItemId } from "~/features/catalog/types/item";

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

export function PresetList({ items, onCreate, onRemove, onUpdate, presets }: PresetListProps) {
  const first = items[0];
  const form = useForm({
    initialInput: {
      lines: [{ content: "", itemId: first?._id ?? "", minutes: 20 }],
      name: "",
      weekday: 1,
    },
    schema: PresetSchema,
  });

  return (
    <Stack gap="md">
      <Title order={2}>プリセット</Title>
      <Card padding="lg" withBorder>
        <Form
          of={form}
          onSubmit={(output) => {
            onCreate({
              lines: parsedLines(output.lines),
              name: output.name,
              weekday: output.weekday,
            });
          }}
        >
          <Grid align="flex-end" gap="sm">
            <Grid.Col span={{ base: 12, sm: 4 }}>
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
            <Grid.Col span={{ base: 12, sm: 2 }}>
              <Field of={form} path={["weekday"]}>
                {(field) => (
                  <Select
                    {...field.props}
                    allowDeselect={false}
                    data={WEEKDAY_OPTIONS}
                    error={field.errors?.[0]}
                    label="曜日"
                    onChange={(value) => {
                      if (value !== null) {
                        field.onChange(Number(value));
                      }
                    }}
                    value={String(field.input)}
                  />
                )}
              </Field>
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 3 }}>
              <Field of={form} path={["lines", 0, "itemId"]}>
                {(field) => (
                  <Select
                    {...field.props}
                    allowDeselect={false}
                    data={itemOptions(items)}
                    error={field.errors?.[0]}
                    label="雛形の項目"
                    onChange={(value) => {
                      if (value !== null) {
                        field.onChange(value);
                      }
                    }}
                    searchable
                    value={field.input}
                  />
                )}
              </Field>
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 3 }}>
              <Field of={form} path={["lines", 0, "content"]}>
                {(field) => (
                  <TextInput
                    {...field.props}
                    error={field.errors?.[0]}
                    label="内容"
                    value={field.input}
                  />
                )}
              </Field>
            </Grid.Col>
            <Grid.Col span={{ base: 6, sm: 3 }}>
              <Field of={form} path={["lines", 0, "minutes"]}>
                {(field) => (
                  <NumberInput
                    {...field.props}
                    error={field.errors?.[0]}
                    label="分数"
                    min={0}
                    onChange={(value) => field.onChange(typeof value === "number" ? value : 0)}
                    value={field.input}
                  />
                )}
              </Field>
            </Grid.Col>
            <Grid.Col span={{ base: 6, sm: 3 }}>
              <Button disabled={first === undefined} fullWidth type="submit">
                プリセットを追加
              </Button>
            </Grid.Col>
          </Grid>
        </Form>
      </Card>
      {presets.map((preset) => (
        <PresetEditor
          key={preset._id}
          items={items}
          onRemove={onRemove}
          onUpdate={onUpdate}
          preset={preset}
        />
      ))}
    </Stack>
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
    <Card padding="lg" withBorder>
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
          <Text c="dimmed" size="sm">
            {preset.name}:{" "}
            {preset.lines.map((line: PresetLineDto) => line.itemName).join("、") || "行なし"}
          </Text>
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
                    allowDeselect={false}
                    aria-label={`${preset.name}の曜日`}
                    data={WEEKDAY_OPTIONS}
                    error={field.errors?.[0]}
                    onChange={(value) => {
                      if (value !== null) {
                        field.onChange(Number(value));
                      }
                    }}
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
          {lines.map((line, index) => (
            <Grid key={`${preset._id}-${index}`} align="flex-end" gap="sm">
              <Grid.Col span={{ base: 12, sm: 4 }}>
                <Select
                  allowDeselect={false}
                  aria-label={`${preset.name}の雛形${index + 1}の項目`}
                  data={itemOptions(items)}
                  onChange={(value) => {
                    if (value === null) {
                      return;
                    }
                    setLines((current) =>
                      current.map((entry, entryIndex) =>
                        entryIndex === index ? { ...entry, itemId: value } : entry,
                      ),
                    );
                  }}
                  searchable
                  value={line.itemId}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 4 }}>
                <TextInput
                  aria-label={`${preset.name}の雛形${index + 1}の内容`}
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
                <Button
                  fullWidth
                  onClick={() => {
                    setLines((current) => current.filter((_, entryIndex) => entryIndex !== index));
                  }}
                  type="button"
                  variant="subtle"
                >
                  雛形{index + 1}を外す
                </Button>
              </Grid.Col>
            </Grid>
          ))}
          <Button
            onClick={() => {
              const next = items[0];
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
