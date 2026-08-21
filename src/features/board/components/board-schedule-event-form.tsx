import { Field, Form, getInput, reset, useForm } from "@formisch/react";
import type { SubmitHandler } from "@formisch/react";
import { Button, Group, Modal, Select, Stack, TextInput } from "@mantine/core";
import { DateTimePicker } from "@mantine/dates";
import { useEffect } from "react";

import {
  BOARD_SCHEDULE_COLORS,
  BoardScheduleEventSchema,
  type BoardScheduleEventInput,
  type BoardScheduleEventOutput,
} from "~/features/board/schemas/board-schedule-event-schema";

type BoardScheduleEventFormProps = {
  initialValues: BoardScheduleEventInput | null;
  onClose: () => void;
  onDelete?: () => void;
  onSubmit: (values: BoardScheduleEventOutput) => Promise<void>;
  opened: boolean;
};

const colorOptions = BOARD_SCHEDULE_COLORS.map((color) => ({ label: color, value: color }));

export function BoardScheduleEventForm({
  initialValues,
  onClose,
  onDelete,
  onSubmit,
  opened,
}: BoardScheduleEventFormProps) {
  const form = useForm({
    initialInput: initialValues ?? {
      blockId: undefined,
      color: "blue",
      end: new Date(),
      start: new Date(),
      title: "",
    },
    schema: BoardScheduleEventSchema,
  });

  useEffect(() => {
    if (initialValues === null) {
      return;
    }
    reset(form, { initialInput: initialValues, keepInput: false });
  }, [form, initialValues]);

  const handleSubmit: SubmitHandler<typeof BoardScheduleEventSchema> = async (values) => {
    await onSubmit(values);
    onClose();
  };

  return (
    <Modal
      onClose={onClose}
      onExitTransitionEnd={() => reset(form)}
      opened={opened}
      title={getInput(form, { path: ["blockId"] }) === undefined ? "予定を追加" : "予定を編集"}
    >
      <Form of={form} onSubmit={handleSubmit}>
        <Stack gap="md">
          <Field of={form} path={["title"]}>
            {(field) => (
              <TextInput
                {...field.props}
                error={field.errors?.[0]}
                label="タイトル"
                value={field.input}
              />
            )}
          </Field>
          <Field of={form} path={["start"]}>
            {(field) => (
              <DateTimePicker
                label="開始"
                onChange={(value) => {
                  if (value !== null) {
                    field.onChange(new Date(value));
                  }
                }}
                value={field.input}
              />
            )}
          </Field>
          <Field of={form} path={["end"]}>
            {(field) => (
              <DateTimePicker
                label="終了"
                onChange={(value) => {
                  if (value !== null) {
                    field.onChange(new Date(value));
                  }
                }}
                value={field.input}
              />
            )}
          </Field>
          <Field of={form} path={["color"]}>
            {(field) => (
              <Select
                {...field.props}
                data={colorOptions}
                label="色"
                onChange={(value) => {
                  if (value !== null) {
                    field.onChange(value as BoardScheduleEventInput["color"]);
                  }
                }}
                value={field.input}
              />
            )}
          </Field>
          <Group justify="flex-end">
            {getInput(form, { path: ["blockId"] }) !== undefined && onDelete !== undefined ? (
              <Button color="red" onClick={onDelete} variant="light">
                削除
              </Button>
            ) : null}
            <Button onClick={onClose} variant="default">
              キャンセル
            </Button>
            <Button loading={form.isSubmitting} type="submit">
              保存
            </Button>
          </Group>
        </Stack>
      </Form>
    </Modal>
  );
}
