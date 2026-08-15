import { Field, Form, useForm } from "@formisch/react";
import { Button, Group, NativeSelect, NumberInput, Stack, Text, TextInput } from "@mantine/core";
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

function parsedLines(lines: PresetLineDraft[]) {
  return lines.map((line) => ({
    content: line.content,
    itemId: parseItemId(line.itemId),
    minutes: line.minutes,
  }));
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
    <Stack gap="sm">
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
        <Group align="flex-end" wrap="wrap">
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
          <Field of={form} path={["weekday"]}>
            {(field) => (
              <NativeSelect
                {...field.props}
                data={WEEKDAY_NAMES.map((label, value) => ({
                  label,
                  value: String(value),
                }))}
                error={field.errors?.[0]}
                label="曜日"
                onChange={(event) => field.onChange(Number(event.currentTarget.value))}
                value={String(field.input)}
              />
            )}
          </Field>
          <Field of={form} path={["lines", 0, "itemId"]}>
            {(field) => (
              <NativeSelect
                {...field.props}
                data={items.map((item) => ({ label: item.name, value: item._id }))}
                error={field.errors?.[0]}
                label="雛形の項目"
                value={field.input}
              />
            )}
          </Field>
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
          <Button disabled={first === undefined} type="submit">
            プリセットを追加
          </Button>
        </Group>
      </Form>
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
      <Stack gap="xs">
        <Group align="flex-end" justify="space-between" wrap="wrap">
          <Text>
            {preset.name}:{" "}
            {preset.lines.map((line: PresetLineDto) => line.itemName).join("、") || "行なし"}
          </Text>
          <Field of={form} path={["name"]}>
            {(field) => (
              <TextInput
                {...field.props}
                aria-label={`${preset.name}の新しい名前`}
                error={field.errors?.[0]}
                value={field.input}
              />
            )}
          </Field>
          <Field of={form} path={["weekday"]}>
            {(field) => (
              <NativeSelect
                {...field.props}
                aria-label={`${preset.name}の曜日`}
                data={WEEKDAY_NAMES.map((label, value) => ({
                  label,
                  value: String(value),
                }))}
                error={field.errors?.[0]}
                onChange={(event) => field.onChange(Number(event.currentTarget.value))}
                value={String(field.input)}
              />
            )}
          </Field>
          <Button type="submit">{preset.name}を保存</Button>
          <Button color="red" onClick={() => onRemove(preset._id)} type="button" variant="subtle">
            {preset.name}を削除
          </Button>
        </Group>
        {lines.map((line, index) => (
          <Group key={`${preset._id}-${index}`} align="flex-end" wrap="wrap">
            <NativeSelect
              aria-label={`${preset.name}の雛形${index + 1}の項目`}
              data={items.map((item) => ({ label: item.name, value: item._id }))}
              onChange={(event) => {
                const itemId = event.currentTarget.value;
                setLines((current) =>
                  current.map((entry, entryIndex) =>
                    entryIndex === index ? { ...entry, itemId } : entry,
                  ),
                );
              }}
              value={line.itemId}
            />
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
            <Button
              onClick={() => {
                setLines((current) => current.filter((_, entryIndex) => entryIndex !== index));
              }}
              type="button"
              variant="subtle"
            >
              雛形{index + 1}を外す
            </Button>
          </Group>
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
  );
}
