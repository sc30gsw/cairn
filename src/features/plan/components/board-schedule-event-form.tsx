import { Field, Form, reset, useForm } from "@formisch/react";
import type { SubmitHandler } from "@formisch/react";
import { ColorSwatch, Group, Select, Stack, Text, TextInput } from "@mantine/core";
import { DateTimePicker } from "@mantine/dates";
import { Result } from "better-result";
import { useEffect, useId } from "react";
import { PLAN_FROZEN_MESSAGE } from "~domain/planEvent";

import { BoardScheduleEditModal } from "~/features/plan/components/board-schedule-edit-modal";
import { boardScheduleColorCss } from "~/features/plan/lib/board-schedule-color-ui";
import { planTimesToInstants } from "~/features/plan/lib/plan-event-instants";
import {
  PLAN_PRIORITY_APP_COLOR,
  PLAN_PRIORITY_OPTIONS,
} from "~/features/plan/lib/plan-priority-style";
import { scheduleInstantToDate } from "~/features/plan/lib/schedule-instant";
import {
  PlanScheduleEventSchema,
  type PlanScheduleEventInput,
  type PlanScheduleEventOutput,
} from "~/features/plan/schemas/board-schedule-event-schema";
import type { PlanCatalogItem, PlanEventDto, PlanScheduleBlock } from "~/features/plan/types/plan";
import type { MutationResult } from "~/lib/run-mutation";

type BoardScheduleEventFormProps = {
  frozen?: boolean;
  initialValues: PlanScheduleEventInput | null;
  items: readonly PlanCatalogItem[];
  onClose: () => void;
  onDelete?: () => Promise<MutationResult | undefined>;
  onSubmit: (values: PlanScheduleEventOutput) => Promise<MutationResult>;
  opened: boolean;
};

function renderPriorityOption(priority: (typeof PLAN_PRIORITY_OPTIONS)[number]) {
  return (
    <Group gap="xs" wrap="nowrap">
      <ColorSwatch color={priority.hex} size={16} />
      <span>{priority.label}</span>
    </Group>
  );
}

export function BoardScheduleEventForm({
  frozen = false,
  initialValues,
  items,
  onClose,
  onDelete,
  onSubmit,
  opened,
}: BoardScheduleEventFormProps) {
  const formId = useId();
  const itemOptions = items.map((item) => ({ label: item.name, value: item._id }));
  const form = useForm({
    initialInput: initialValues ?? {
      end: new Date(),
      eventId: undefined,
      itemId: undefined,
      priority: "medium",
      start: new Date(),
      title: "",
    },
    schema: PlanScheduleEventSchema,
  });

  useEffect(() => {
    if (initialValues === null) {
      return;
    }
    reset(form, { initialInput: initialValues, keepInput: false });
  }, [form, initialValues]);

  const handleSubmit: SubmitHandler<typeof PlanScheduleEventSchema> = async (values) => {
    const result = await onSubmit(values);
    if (result !== undefined && Result.isOk(result)) onClose();
  };

  const isEditing = initialValues?.eventId !== undefined;

  return (
    <BoardScheduleEditModal
      formId={formId}
      onClose={onClose}
      onDelete={isEditing && onDelete !== undefined ? () => void onDelete() : undefined}
      onExitTransitionEnd={() => reset(form)}
      opened={opened}
      submitting={form.isSubmitting}
      title={isEditing ? "予定を編集" : "予定を追加"}
    >
      <Form id={formId} of={form} onSubmit={handleSubmit}>
        <Stack gap="md">
          <Field of={form} path={["eventId"]}>
            {(field) => <input type="hidden" value={field.input ?? ""} readOnly />}
          </Field>
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
          <Field of={form} path={["itemId"]}>
            {(field) => (
              <Select
                {...field.props}
                clearable
                data={itemOptions}
                disabled={frozen}
                error={field.errors?.[0]}
                label="項目"
                onChange={(value) => {
                  field.onChange(value === null || value === "" ? undefined : value);
                }}
                placeholder="なし（記録は作らない）"
                value={field.input ?? null}
              />
            )}
          </Field>
          {frozen ? (
            <Text c="dimmed" size="sm">
              {PLAN_FROZEN_MESSAGE}
            </Text>
          ) : null}
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
          <Field of={form} path={["priority"]}>
            {(field) => (
              <Select
                {...field.props}
                data={PLAN_PRIORITY_OPTIONS.map((option) => ({
                  label: option.label,
                  value: option.value,
                }))}
                label="優先度"
                leftSection={
                  field.input === undefined ? undefined : (
                    <ColorSwatch
                      color={boardScheduleColorCss(PLAN_PRIORITY_APP_COLOR[field.input])}
                      size={16}
                    />
                  )
                }
                onChange={(value) => {
                  const option = PLAN_PRIORITY_OPTIONS.find((entry) => entry.value === value);
                  if (option !== undefined) {
                    field.onChange(option.value);
                  }
                }}
                renderOption={({ option }) => {
                  const priority = PLAN_PRIORITY_OPTIONS.find(
                    (entry) => entry.value === option.value,
                  );
                  return priority === undefined ? null : renderPriorityOption(priority);
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

function blockFormValues(block: PlanScheduleBlock): PlanScheduleEventInput {
  return {
    end: scheduleInstantToDate(block.endAt),
    eventId: block._id,
    itemId: block.itemId,
    priority: block.priority,
    start: scheduleInstantToDate(block.startAt),
    title: block.title,
  };
}

function eventFormValues(event: PlanEventDto): PlanScheduleEventInput {
  const instants = planTimesToInstants(event.dateJst, event.startTime, event.endTime);
  return {
    end: scheduleInstantToDate(instants.endAt),
    eventId: event._id,
    itemId: event.itemId,
    priority: event.priority,
    start: scheduleInstantToDate(instants.startAt),
    title: event.title,
  };
}

function slotFormValues(start: string, end: string): PlanScheduleEventInput {
  return {
    end: scheduleInstantToDate(end),
    eventId: undefined,
    itemId: undefined,
    priority: "medium",
    start: scheduleInstantToDate(start),
    title: "",
  };
}

export { blockFormValues, eventFormValues, slotFormValues };
