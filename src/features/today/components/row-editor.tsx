import { Button, Group, NumberInput, TextInput } from "@mantine/core";
import { useState } from "react";

import type { DayRow } from "~/features/today/types/day";

type RowEditorProps = {
  disabled?: boolean;
  onConfirm: (input: { content: string; minutes: number; rowId: DayRow["_id"] }) => void;
  onRemove: (rowId: DayRow["_id"]) => void;
  onSkip: (rowId: DayRow["_id"]) => void;
  row: DayRow;
};

export function RowEditor({ disabled = false, onConfirm, onRemove, onSkip, row }: RowEditorProps) {
  const [content, setContent] = useState(row.content);
  const [minutes, setMinutes] = useState(row.minutes);

  return (
    <form
      aria-label={`${row.itemName}の行`}
      onSubmit={(event) => {
        event.preventDefault();
        onConfirm({ content, minutes, rowId: row._id });
      }}
    >
      <Group align="flex-end" gap="xs" wrap="wrap">
        <TextInput
          disabled={disabled}
          label={row.itemName}
          onChange={(event) => setContent(event.currentTarget.value)}
          value={content}
        />
        <NumberInput
          disabled={disabled}
          label="分数"
          min={0}
          onChange={(value) => setMinutes(typeof value === "number" ? value : 0)}
          value={minutes}
        />
        <Button disabled={disabled} type="submit">
          確定
        </Button>
        <Button disabled={disabled} onClick={() => onSkip(row._id)} type="button" variant="light">
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
        <span>{row.status}</span>
      </Group>
    </form>
  );
}
