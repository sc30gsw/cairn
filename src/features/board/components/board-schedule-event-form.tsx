import { Field, Form, reset, useForm } from "@formisch/react";
import type { SubmitHandler } from "@formisch/react";
import { Button, ColorSwatch, Group, Modal, Select, Stack } from "@mantine/core";
import { DateTimePicker } from "@mantine/dates";
import { useEffect } from "react";
import { DEFAULT_BOARD_SCHEDULE_COLOR } from "~domain/boardScheduleColors";

import { boardScheduleColorCss } from "~/features/board/lib/board-schedule-color-ui";
import { scheduleInstantToDate } from "~/features/board/lib/schedule-instant";
import {
  BOARD_SCHEDULE_COLORS,
  BoardScheduleEventSchema,
  type BoardScheduleColor,
  type BoardScheduleEventInput,
  type BoardScheduleEventOutput,
} from "~/features/board/schemas/board-schedule-event-schema";
import type { BoardRow, BoardScheduleBlock } from "~/features/board/types/board";

type BoardScheduleEventFormProps = {
  initialValues: BoardScheduleEventInput | null;
  onClose: () => void;
  onDelete?: () => void | Promise<void>;
  onSubmit: (values: BoardScheduleEventOutput) => Promise<void>;
  opened: boolean;
  rows: readonly BoardRow[];
};

const colorOptions = BOARD_SCHEDULE_COLORS.map((color) => ({ label: color, value: color }));

function renderScheduleColorOption(color: BoardScheduleColor) {
  return (
    <Group gap="xs" wrap="nowrap">
      <ColorSwatch color={boardScheduleColorCss(color)} radius="sm" size={16} />
      <span>{color}</span>
    </Group>
  );
}

export function BoardScheduleEventForm({
  initialValues,
  onClose,
  onDelete,
  onSubmit,
  opened,
  rows,
}: BoardScheduleEventFormProps) {
  const rowOptions = rows.map((row) => ({ label: row.itemName, value: row._id }));
  const form = useForm({
    initialInput: initialValues ?? {
      blockId: undefined,
      color: DEFAULT_BOARD_SCHEDULE_COLOR,
      end: new Date(),
      rowId: (rows[0]?._id ?? "") as BoardRow["_id"],
      start: new Date(),
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

  const isEditing = initialValues?.blockId !== undefined;

  return (
    <Modal
      onClose={onClose}
      onExitTransitionEnd={() => reset(form)}
      opened={opened}
      title={isEditing ? "予定を編集" : "予定を追加"}
    >
      <Form of={form} onSubmit={handleSubmit}>
        <Stack gap="md">
          <Field of={form} path={["blockId"]}>
            {(field) => <input type="hidden" value={field.input ?? ""} readOnly />}
          </Field>
          <Field of={form} path={["rowId"]}>
            {(field) => (
              <Select
                {...field.props}
                data={rowOptions}
                error={field.errors?.[0]}
                label="項目"
                onChange={(value) => {
                  if (value !== null) {
                    field.onChange(value);
                  }
                }}
                value={field.input}
              />
            )}
          </Field>
          <Field of={form} path={["start"]}>
            {(field) => (
              <DateTimePicker
                error={field.errors?.[0]}
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
                error={field.errors?.[0]}
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
                leftSection={
                  field.input === undefined ? undefined : (
                    <ColorSwatch color={boardScheduleColorCss(field.input)} radius="sm" size={18} />
                  )
                }
                leftSectionWidth={32}
                onChange={(value) => {
                  if (value !== null) {
                    field.onChange(value as BoardScheduleEventInput["color"]);
                  }
                }}
                renderOption={({ option }) =>
                  renderScheduleColorOption(option.value as BoardScheduleColor)
                }
                value={field.input}
              />
            )}
          </Field>
          <Group justify="space-between" wrap="nowrap">
            {isEditing && onDelete !== undefined ? (
              <Button color="red" onClick={() => void onDelete()} type="button" variant="filled">
                削除
              </Button>
            ) : (
              <span />
            )}
            <Group gap="sm" wrap="nowrap">
              <Button onClick={onClose} type="button" variant="default">
                キャンセル
              </Button>
              <Button disabled={rows.length === 0} loading={form.isSubmitting} type="submit">
                保存
              </Button>
            </Group>
          </Group>
        </Stack>
      </Form>
    </Modal>
  );
}

function blockFormValues(block: BoardScheduleBlock): BoardScheduleEventInput {
  return {
    blockId: block._id,
    color: block.color as BoardScheduleEventInput["color"],
    end: scheduleInstantToDate(block.endAt),
    rowId: block.rowId,
    start: scheduleInstantToDate(block.startAt),
  };
}

function slotFormValues(
  rows: readonly BoardRow[],
  start: string,
  end: string,
): BoardScheduleEventInput | null {
  const firstRow = rows[0];
  if (firstRow === undefined) {
    return null;
  }
  return {
    blockId: undefined,
    color: DEFAULT_BOARD_SCHEDULE_COLOR,
    end: scheduleInstantToDate(end),
    rowId: firstRow._id,
    start: scheduleInstantToDate(start),
  };
}

export { blockFormValues, slotFormValues };
