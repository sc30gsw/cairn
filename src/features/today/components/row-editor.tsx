import { Field, Form, useForm } from "@formisch/react";
import { Badge, Button, Grid, Group, NumberInput, TextInput } from "@mantine/core";

import { RowEditorSchema } from "~/features/today/schemas/row-editor-schema";
import type { DayRow } from "~/features/today/types/day";

type RowEditorProps = {
  disabled?: boolean;
  onConfirm: (input: { content: string; minutes: number; rowId: DayRow["_id"] }) => void;
  onRemove: (rowId: DayRow["_id"]) => void;
  onSkip: (rowId: DayRow["_id"]) => void;
  row: DayRow;
};

function statusColor(status: DayRow["status"]) {
  if (status === "確定") {
    return "cyan";
  }
  if (status === "スキップ") {
    return "yellow";
  }
  return "gray";
}

export function RowEditor({ disabled = false, onConfirm, onRemove, onSkip, row }: RowEditorProps) {
  const form = useForm({
    initialInput: { content: row.content, minutes: row.minutes },
    schema: RowEditorSchema,
  });

  return (
    <Form
      aria-label={`${row.itemName}の行`}
      of={form}
      onSubmit={(output) => {
        onConfirm({ content: output.content, minutes: output.minutes, rowId: row._id });
      }}
    >
      <Grid align="flex-end" gap="sm">
        <Grid.Col span={{ base: 12, sm: 5 }}>
          <Field of={form} path={["content"]}>
            {(field) => (
              <TextInput
                {...field.props}
                disabled={disabled}
                error={field.errors?.[0]}
                label={row.itemName}
                value={field.input}
              />
            )}
          </Field>
        </Grid.Col>
        <Grid.Col span={{ base: 6, sm: 2 }}>
          <Field of={form} path={["minutes"]}>
            {(field) => (
              <NumberInput
                {...field.props}
                disabled={disabled}
                error={field.errors?.[0]}
                label="分数"
                min={0}
                onChange={(value) => field.onChange(typeof value === "number" ? value : 0)}
                value={field.input}
              />
            )}
          </Field>
        </Grid.Col>
        <Grid.Col span={{ base: 6, sm: 5 }}>
          <Group gap="xs" wrap="wrap">
            <Button disabled={disabled} type="submit">
              確定
            </Button>
            <Button
              disabled={disabled}
              onClick={() => onSkip(row._id)}
              type="button"
              variant="light"
            >
              スキップ
            </Button>
            <Button
              color="red"
              disabled={disabled}
              onClick={() => onRemove(row._id)}
              type="button"
              variant="subtle"
            >
              ゴミ箱へ
            </Button>
            <Badge color={statusColor(row.status)} variant="light">
              {row.status}
            </Badge>
          </Group>
        </Grid.Col>
      </Grid>
    </Form>
  );
}
