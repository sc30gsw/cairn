import { Field, Form, useForm } from "@formisch/react";
import { Button, Group, Select, Stack, Text } from "@mantine/core";

import { CalendarOutputSchema } from "~/lib/calendar-output-schema";
import type { CalendarConnection, CalendarOutput } from "~/lib/calendar-sync-types";
import { onRequiredSelect } from "~/lib/select";

type CalendarOutputFormProps = {
  busy: boolean;
  connections: CalendarConnection[];
  onSave: (output: CalendarOutput) => Promise<void>;
  output: CalendarOutput | null;
};

export function CalendarOutputForm({ busy, connections, onSave, output }: CalendarOutputFormProps) {
  const form = useForm({
    initialInput: {
      destination: output === null ? "" : JSON.stringify([output.connectionId, output.calendarId]),
    },
    schema: CalendarOutputSchema,
  });
  const groups = connections.flatMap((connection) => {
    const items = connection.calendars.flatMap((calendar) => {
      if (
        calendar.accessRole !== "owner" &&
        calendar.accessRole !== "writer" &&
        calendar.accessRole !== "writerWithoutPrivateAccess"
      )
        return [];
      return [
        {
          calendarId: calendar.id,
          connectionId: connection.connectionId,
          disabled: connection.status === "needsReauth",
          label: calendar.summary,
          value: JSON.stringify([connection.connectionId, calendar.id]),
        },
      ];
    });
    return items.length === 0
      ? []
      : [{ group: connection.googleEmail ?? "Google アカウント", items }];
  });
  const destinations = groups.flatMap((group) => group.items);

  return (
    <Form
      of={form}
      onSubmit={async ({ destination }) => {
        const selected = destinations.find((candidate) => candidate.value === destination);
        if (selected === undefined || selected.disabled) return;
        await onSave({ connectionId: selected.connectionId, calendarId: selected.calendarId });
      }}
    >
      <Stack gap="sm">
        <Field of={form} path={["destination"]}>
          {(field) => (
            <Select
              {...field.props}
              allowDeselect={false}
              data={groups}
              description="本番日・チェックポイントの期限・学習予定を、このカレンダーに保存します。"
              disabled={busy || destinations.length === 0}
              error={field.errors?.[0]}
              label="Cairn の予定の保存先"
              nothingFoundMessage="保存できるカレンダーがありません"
              onChange={onRequiredSelect(field.onChange)}
              placeholder="カレンダーを選択"
              searchable
              value={field.input || null}
            />
          )}
        </Field>
        <Text c="dimmed" size="xs">
          保存先を変更すると、Cairn が Google に作った予定も移動します。
          追加アカウントの会議など、Google で作られた予定は閲覧専用です。
        </Text>
        {output === null ? (
          <Text c="dimmed" size="xs">
            保存先を選ぶまで、Cairn の予定は Google に送信されません。
          </Text>
        ) : null}
        <Group justify="flex-end">
          <Button
            disabled={busy || !form.isDirty}
            loading={form.isSubmitting}
            type="submit"
            variant="light"
          >
            {output === null ? "保存先を設定" : "保存先を変更"}
          </Button>
        </Group>
      </Stack>
    </Form>
  );
}
