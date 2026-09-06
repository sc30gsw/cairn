import { Field, Form, reset, useForm } from "@formisch/react";
import type { SubmitHandler } from "@formisch/react";
import { Button, Group, Modal, NumberInput, Stack, Textarea } from "@mantine/core";
import { Result } from "better-result";
import { useEffect } from "react";
import { hasTimerState } from "~domain/rowTimer";

import type { BoardRow } from "~/features/board/types/board";
import type { MutationResult } from "~/lib/run-mutation";
import { RowEditorSchema } from "~/lib/validation/row-editor-schema";

type KanbanConfirmInput = {
  content: string;
  minutes: number;
  rowId: BoardRow["_id"];
};

type BoardKanbanConfirmModalProps = {
  onClose: () => void;
  onConfirm: (input: KanbanConfirmInput) => Promise<MutationResult | undefined>;
  opened: boolean;
  prefillMinutes: number | null;
  row: BoardRow | null;
};

export function BoardKanbanConfirmModal({
  onClose,
  onConfirm,
  opened,
  prefillMinutes,
  row,
}: BoardKanbanConfirmModalProps) {
  const form = useForm({
    initialInput: {
      content: row?.content ?? "",
      minutes: prefillMinutes ?? row?.minutes ?? 0,
    },
    schema: RowEditorSchema,
  });

  useEffect(() => {
    if (row === null) {
      return;
    }
    reset(form, {
      initialInput: { content: row.content, minutes: prefillMinutes ?? row.minutes },
      keepInput: false,
    });
  }, [form, prefillMinutes, row]);

  const handleSubmit: SubmitHandler<typeof RowEditorSchema> = async (values) => {
    if (row === null) {
      return;
    }
    const result = await onConfirm({
      content: values.content,
      minutes: values.minutes,
      rowId: row._id,
    });
    if (result !== undefined && Result.isOk(result)) onClose();
  };

  return (
    <Modal onClose={onClose} opened={opened} title="記録を確定">
      <Form of={form} onSubmit={handleSubmit}>
        <Stack gap="md">
          <Field of={form} path={["content"]}>
            {(field) => (
              <Textarea
                {...field.props}
                error={field.errors?.[0]}
                label="内容"
                minRows={2}
                onChange={(event) => field.onChange(event.currentTarget.value)}
                value={field.input}
              />
            )}
          </Field>
          <Field of={form} path={["minutes"]}>
            {(field) => (
              <NumberInput
                error={field.errors?.[0]}
                label="分数"
                min={0}
                onChange={(value) => field.onChange(typeof value === "number" ? value : 0)}
                value={field.input}
              />
            )}
          </Field>
          <Group gap="sm" justify="flex-end">
            <Button onClick={onClose} type="button" variant="default">
              キャンセル
            </Button>
            <Button loading={form.isSubmitting} type="submit">
              確定
            </Button>
          </Group>
        </Stack>
      </Form>
    </Modal>
  );
}

export function needsKanbanConfirmEditor(row: BoardRow): boolean {
  return row.minutes === 0 && !hasTimerState(row.timer);
}
