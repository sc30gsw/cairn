import { Field, Form, reset, useForm } from "@formisch/react";
import type { SubmitHandler } from "@formisch/react";
import { ColorSwatch, Group, Select, Stack } from "@mantine/core";
import { DateTimePicker } from "@mantine/dates";
import { Result } from "better-result";
import { useEffect, useId } from "react";
import { DEFAULT_BOARD_SCHEDULE_COLOR } from "~domain/boardScheduleColors";

import { BoardScheduleEditModal } from "~/features/board/components/board-schedule-edit-modal";
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
import type { MutationResult } from "~/lib/run-mutation";

type BoardScheduleEventFormProps = {
  initialValues: BoardScheduleEventInput | null;
  onClose: () => void;
  onDelete?: () => Promise<MutationResult | undefined>;
  onSubmit: (values: BoardScheduleEventOutput) => Promise<MutationResult>;
  opened: boolean;
  rows: readonly BoardRow[];
};

const colorOptions = BOARD_SCHEDULE_COLORS.map((color) => ({
  label: color.charAt(0).toUpperCase() + color.slice(1),
  value: color,
}));

function renderScheduleColorOption(color: BoardScheduleColor, label: string) {
  return (
    <Group gap="xs" wrap="nowrap">
      <ColorSwatch color={boardScheduleColorCss(color)} size={16} />
      <span>{label}</span>
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
  const formId = useId();
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
    const result = await onSubmit(values);
    if (result !== undefined && Result.isOk(result)) onClose();
  };

  const isEditing = initialValues?.blockId !== undefined;

  return (
    <BoardScheduleEditModal
      formId={formId}
      onDelete={isEditing && onDelete !== undefined ? () => void onDelete() : undefined}
      saveDisabled={rows.length === 0}
      submitting={form.isSubmitting}
      onClose={onClose}
      onExitTransitionEnd={() => reset(form)}
      opened={opened}
      title={isEditing ? "予定を編集" : "予定を追加"}
    >
      <Form id={formId} of={form} onSubmit={handleSubmit}>
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
                    <ColorSwatch color={boardScheduleColorCss(field.input)} size={16} />
                  )
                }
                onChange={(value) => {
                  const option = colorOptions.find((entry) => entry.value === value);
                  if (option !== undefined) {
                    field.onChange(option.value);
                  }
                }}
                renderOption={({ option }) => {
                  const color = colorOptions.find((entry) => entry.value === option.value);
                  return color === undefined
                    ? null
                    : renderScheduleColorOption(color.value, color.label);
                }}
                value={field.input}
              />
            )}
          </Field>
        </Stack>
      </Form>
    </BoardScheduleEditModal>
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
