import { Field, Form, reset, useForm } from "@formisch/react";
import type { SubmitHandler } from "@formisch/react";
import { ColorSwatch, Group, Select, Stack, Text, TextInput } from "@mantine/core";
import { TimeInput } from "@mantine/dates";
import { Result } from "better-result";
import { useEffect, useId } from "react";
import type { DateJst } from "~domain/jst";
import { PLAN_FROZEN_MESSAGE } from "~domain/planEvent";

import { BoardScheduleEditModal } from "~/features/plan/components/board-schedule-edit-modal";
import { boardScheduleColorCss } from "~/features/plan/lib/board-schedule-color-ui";
import { planTimesToInstants } from "~/features/plan/lib/plan-event-instants";
import {
  planEventDateWithTime,
  planEventEndTimeLabel,
  planEventTimeLabel,
} from "~/features/plan/lib/plan-event-time";
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
  dateJst: DateJst;
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
  dateJst,
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
    const titleFilled = initialValues.title.trim() !== "";
    reset(form, {
      initialInput:
        frozen || !titleFilled ? initialValues : { ...initialValues, itemId: undefined },
      keepInput: false,
    });
  }, [form, frozen, initialValues]);

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
          <Field of={form} path={["itemId"]}>
            {(itemField) => (
              <Field of={form} path={["title"]}>
                {(titleField) => {
                  const titleFilled = (titleField.input ?? "").trim() !== "";
                  const itemChosen = itemField.input !== undefined;
                  const showItem = frozen || !titleFilled;
                  const showTitle = frozen ? titleFilled : !itemChosen || titleFilled;
                  return (
                    <>
                      {showItem ? (
                        <Select
                          {...itemField.props}
                          allowDeselect={false}
                          clearButtonProps={{ "aria-label": "項目をクリア" }}
                          clearable
                          data={itemOptions}
                          disabled={frozen}
                          error={itemField.errors?.[0]}
                          label="項目"
                          nothingFoundMessage="項目が見つかりません"
                          onChange={(value) => {
                            const itemId = value === null || value === "" ? undefined : value;
                            itemField.onChange(itemId);
                            if (itemId !== undefined) {
                              titleField.onChange("");
                            }
                          }}
                          placeholder="なし（記録は作らない）"
                          searchable
                          value={itemField.input ?? null}
                        />
                      ) : null}
                      {frozen ? (
                        <Text c="dimmed" size="sm">
                          {PLAN_FROZEN_MESSAGE}
                        </Text>
                      ) : null}
                      {showTitle ? (
                        <TextInput
                          {...titleField.props}
                          error={titleField.errors?.[0]}
                          label="タイトル"
                          onChange={(event) => {
                            const value = event.currentTarget.value;
                            titleField.onChange(value);
                            if (!frozen && value.trim() !== "") {
                              itemField.onChange(undefined);
                            }
                          }}
                          value={titleField.input}
                        />
                      ) : null}
                    </>
                  );
                }}
              </Field>
            )}
          </Field>
          <Field of={form} path={["start"]}>
            {(startField) => (
              <Field of={form} path={["end"]}>
                {(endField) => (
                  <Group align="flex-end" grow>
                    <TimeInput
                      error={startField.errors?.[0]}
                      label="開始"
                      onChange={(event) => {
                        const time = event.currentTarget.value;
                        if (time !== "") {
                          startField.onChange(planEventDateWithTime(dateJst, time));
                        }
                      }}
                      value={planEventTimeLabel(startField.input as Date)}
                    />
                    <TimeInput
                      error={endField.errors?.[0]}
                      label="終了"
                      onChange={(event) => {
                        const time = event.currentTarget.value;
                        if (time !== "") {
                          endField.onChange(planEventDateWithTime(dateJst, time));
                        }
                      }}
                      value={planEventEndTimeLabel(
                        dateJst,
                        startField.input as Date,
                        endField.input as Date,
                      )}
                    />
                  </Group>
                )}
              </Field>
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
