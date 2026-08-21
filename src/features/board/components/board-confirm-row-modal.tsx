import { Field, Form, reset, useForm } from "@formisch/react";
import type { SubmitHandler } from "@formisch/react";
import { Button, Group, Modal, NumberInput, Stack } from "@mantine/core";
import { useEffect } from "react";

import { ConcreteActionFieldWithSuggestions } from "~/components/concrete-action-field-with-suggestions";
import type { BoardConfirmRowInput } from "~/features/board/hooks/board-mutations";
import type { BoardRow } from "~/features/board/types/board";
import { validateConfirmRow } from "~/features/today/lib/validate-confirm-row";
import { RowEditorSchema } from "~/features/today/schemas/row-editor-schema";

type BoardConfirmRowModalProps = {
  onClose: () => void;
  onConfirm: (input: BoardConfirmRowInput) => Promise<void>;
  opened: boolean;
  row: BoardRow | null;
};

export function BoardConfirmRowModal({
  onClose,
  onConfirm,
  opened,
  row,
}: BoardConfirmRowModalProps) {
  const form = useForm({
    initialInput: {
      content: row?.content ?? "",
      minutes: row?.minutes ?? 0,
    },
    schema: RowEditorSchema,
  });

  useEffect(() => {
    if (row === null) {
      return;
    }
    reset(form, {
      initialInput: { content: row.content, minutes: row.minutes },
      keepInput: false,
    });
  }, [form, row]);

  const handleSubmit: SubmitHandler<typeof RowEditorSchema> = async () => {
    if (row === null) {
      return;
    }
    const output = await validateConfirmRow(form);
    if (output === null) {
      return;
    }
    await onConfirm({ content: output.content, minutes: output.minutes, rowId: row._id });
    onClose();
  };

  return (
    <Modal onClose={onClose} opened={opened} title={row?.itemName ?? "記録を確定"}>
      {row === null ? null : (
        <Form of={form} onSubmit={handleSubmit}>
          <Stack gap="md">
            <Field of={form} path={["content"]}>
              {(field) => (
                <ConcreteActionFieldWithSuggestions
                  {...field.props}
                  error={field.errors?.[0]}
                  itemId={row.itemId}
                  itemName={row.itemName}
                  label="ひとこと"
                  onValueChange={(value) => field.onChange(value)}
                  value={field.input}
                />
              )}
            </Field>
            <Field of={form} path={["minutes"]}>
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
            <Group justify="flex-end">
              <Button onClick={onClose} variant="default">
                キャンセル
              </Button>
              <Button loading={form.isSubmitting} type="submit">
                確定
              </Button>
            </Group>
          </Stack>
        </Form>
      )}
    </Modal>
  );
}
