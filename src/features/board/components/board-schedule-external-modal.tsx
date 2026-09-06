import { Field, Form, useForm, type SubmitHandler } from "@formisch/react";
import { ColorSwatch, Flex, Group, Select, Stack, Text, TextInput } from "@mantine/core";
import { DatePickerInput, DateTimePicker } from "@mantine/dates";
import { modals } from "@mantine/modals";
import { IconCalendar } from "@tabler/icons-react";
import { Result } from "better-result";
import { useId } from "react";
import {
  GOOGLE_CALENDAR_EVENT_COLORS,
  DEFAULT_GOOGLE_CALENDAR_EVENT_COLOR,
  googleCalendarEventColor,
} from "~domain/googleCalendarColors";

import { GoogleLabel } from "~/components/google-label";
import { BoardScheduleEditModal } from "~/features/board/components/board-schedule-edit-modal";
import { scheduleInstantToDate } from "~/features/board/lib/schedule-instant";
import {
  BoardExternalEventSchema,
  type BoardExternalEventOutput,
} from "~/features/board/schemas/board-external-event-schema";
import type { BoardExternalEvent } from "~/features/board/types/board";
import type { MutationResult } from "~/lib/run-mutation";

const REMOVE_LABEL = "削除";
const colorOptions = GOOGLE_CALENDAR_EVENT_COLORS.map((color) => ({
  value: color.id,
  label: color.label,
}));

type ExternalModalProps = {
  external: BoardExternalEvent | null;
  onClose: () => void;
  onRemove: (externalId: BoardExternalEvent["_id"]) => Promise<MutationResult>;
  onUpdate: (values: BoardExternalEventOutput) => Promise<MutationResult>;
};

function ExternalEventForm({
  external,
  onClose,
  onRemove,
  onUpdate,
}: Omit<ExternalModalProps, "external"> & { external: BoardExternalEvent }) {
  const formId = useId();
  const colorId =
    GOOGLE_CALENDAR_EVENT_COLORS.find((color) => color.id === external.colorId)?.id ??
    DEFAULT_GOOGLE_CALENDAR_EVENT_COLOR.id;
  const form = useForm({
    schema: BoardExternalEventSchema,
    initialInput: {
      title: external.title,
      colorId,
      start: scheduleInstantToDate(external.startAt),
      end: scheduleInstantToDate(external.endAt),
    },
  });
  const handleSubmit: SubmitHandler<typeof BoardExternalEventSchema> = async (values) => {
    if (!external.canEdit) return;
    const result = await onUpdate(values);
    if (Result.isOk(result)) onClose();
  };
  function requestRemove() {
    if (!external.canEdit) return;
    modals.openConfirmModal({
      title: <GoogleLabel>この予定を Google カレンダーから削除しますか？</GoogleLabel>,
      children: "Google カレンダー上の予定も削除されます。記録や学習量には影響しません。",
      confirmProps: { color: "red" },
      labels: { cancel: "キャンセル", confirm: REMOVE_LABEL },
      onConfirm: async () => {
        const result = await onRemove(external._id);
        if (Result.isOk(result)) onClose();
      },
    });
  }
  return (
    <BoardScheduleEditModal
      formId={formId}
      opened
      onClose={onClose}
      onDelete={requestRemove}
      deleteTooltip="Google カレンダー上の予定も削除されます"
      readOnly={!external.canEdit}
      submitting={form.isSubmitting}
      title={<GoogleLabel>{external.canEdit ? "予定を編集" : "外部予定"}</GoogleLabel>}
    >
      <Group gap="xs" wrap="nowrap">
        <Text size="sm">接続中のGoogleアカウント</Text>
        <Stack gap={0}>
          <Text size="sm">{external.calendarName}</Text>
          {external.calendarName !== external.calendarEmail && (
            <Text c="dimmed" size="xs">
              {external.calendarEmail ?? "連携アカウントのメールアドレスを取得できませんでした"}
            </Text>
          )}
        </Stack>
      </Group>
      <Text c="dimmed" size="sm">
        {external.canEdit
          ? "保存・削除すると、Google カレンダー上の予定も変更・削除されます。"
          : "読み取り専用のカレンダーです。この予定は変更・削除できません。"}
      </Text>
      <Form id={formId} of={form} onSubmit={handleSubmit}>
        <Stack gap="md">
          <Field of={form} path={["title"]}>
            {(field) => (
              <TextInput
                {...field.props}
                disabled={!external.canEdit}
                error={field.errors?.[0]}
                label="件名"
                onChange={(event) => field.onChange(event.currentTarget.value)}
                value={field.input ?? ""}
              />
            )}
          </Field>
          {(["start", "end"] as const satisfies readonly (keyof BoardExternalEventOutput)[]).map(
            (path) => (
              <Field key={path} of={form} path={[path]}>
                {(field) =>
                  external.allDay ? (
                    <DatePickerInput
                      disabled={!external.canEdit}
                      error={field.errors?.[0]}
                      label={path === "start" ? "開始日（終日）" : "終了日（終日）"}
                      onChange={(value) => {
                        if (value !== null) {
                          const date = new Date(value);
                          date.setHours(
                            path === "start" ? 0 : 23,
                            path === "start" ? 0 : 59,
                            path === "start" ? 0 : 59,
                            0,
                          );
                          field.onChange(date);
                        }
                      }}
                      value={field.input}
                    />
                  ) : (
                    <DateTimePicker
                      disabled={!external.canEdit}
                      error={field.errors?.[0]}
                      label={path === "start" ? "開始" : "終了"}
                      onChange={(value) => {
                        if (value !== null) field.onChange(new Date(value));
                      }}
                      value={field.input}
                    />
                  )
                }
              </Field>
            ),
          )}
          <Field of={form} path={["colorId"]}>
            {(field) => (
              <Select
                {...field.props}
                disabled={!external.canEdit}
                data={colorOptions}
                error={field.errors?.[0]}
                label="色"
                leftSection={
                  <ColorSwatch color={googleCalendarEventColor(field.input)} size={16} />
                }
                onChange={(value) => {
                  const option = colorOptions.find((entry) => entry.value === value);
                  if (option !== undefined) field.onChange(option.value);
                }}
                value={field.input}
                renderOption={({ option }) => (
                  <Group gap="xs">
                    <ColorSwatch color={googleCalendarEventColor(option.value)} size={16} />
                    <span>{option.label}</span>
                  </Group>
                )}
              />
            )}
          </Field>
        </Stack>
      </Form>
    </BoardScheduleEditModal>
  );
}

export function BoardScheduleExternalModal({ external, ...props }: ExternalModalProps) {
  return external === null ? null : (
    <ExternalEventForm
      external={external}
      onClose={props.onClose}
      onRemove={props.onRemove}
      onUpdate={props.onUpdate}
      key={external._id}
    />
  );
}
