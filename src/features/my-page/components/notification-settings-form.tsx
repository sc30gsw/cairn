import { Form, useField, useForm } from "@formisch/react";
import { Alert, Button, Fieldset, Group, Select, Stack, Switch, Text } from "@mantine/core";
import type { NotificationSettingsDto } from "~domain/validators";

import { eveningHourOptions, quietHourOptions } from "~/features/my-page/lib/hour-options";
import {
  type NotificationSettingsFormOutput,
  NotificationSettingsSchema,
} from "~/features/my-page/schemas/notification-settings-schema";
import type { SaveNotificationSettingsInput } from "~/features/my-page/types/notification-settings";
import { onRequiredSelect } from "~/lib/select";
import { NUMERAL_FONT } from "~/lib/theme";

const QUIET_HOURS_HINT =
  "静穏時間は端末への通知（Web Push）だけを止めます。通知欄には残ります。開始と終了を同じ時刻にすると静穏なしです。";

export function NotificationSettingsForm({
  onSave,
  settings,
}: {
  onSave: (input: SaveNotificationSettingsInput) => void;
  settings: NotificationSettingsDto;
}) {
  const form = useForm({
    initialInput: {
      enabled: settings.enabled,
      eveningHourJst: settings.eveningHourJst,
      quietFromHourJst: settings.quietFromHourJst,
      quietToHourJst: settings.quietToHourJst,
      triggers: { ...settings.triggers },
    },
    schema: NotificationSettingsSchema,
  });
  const enabledField = useField(form, { path: ["enabled"] });
  const checkpointField = useField(form, { path: ["triggers", "checkpointDeadline"] });
  const weeklyField = useField(form, { path: ["triggers", "weeklyTargetMiss"] });
  const eveningField = useField(form, { path: ["triggers", "eveningUntouched"] });
  const eveningHourField = useField(form, { path: ["eveningHourJst"] });
  const quietFromField = useField(form, { path: ["quietFromHourJst"] });
  const quietToField = useField(form, { path: ["quietToHourJst"] });

  const enabled = enabledField.input ?? settings.enabled;
  const eveningHour = eveningHourField.input ?? settings.eveningHourJst;
  const quietFrom = quietFromField.input ?? settings.quietFromHourJst;
  const quietTo = quietToField.input ?? settings.quietToHourJst;

  return (
    <Stack gap="md">
      {enabled ? null : (
        <Alert color="yellow" variant="light">
          通知はまだ有効になっていません。
        </Alert>
      )}
      <Form
        of={form}
        onSubmit={(output: NotificationSettingsFormOutput) => {
          onSave(output);
        }}
      >
        <Stack gap="md">
          <Switch
            {...enabledField.props}
            checked={enabled}
            error={enabledField.errors?.[0]}
            label="通知を使う"
          />
          <Fieldset legend="知らせる内容">
            <Stack gap="xs">
              <Switch
                {...checkpointField.props}
                checked={checkpointField.input ?? settings.triggers.checkpointDeadline}
                label="チェックポイントの期限が近いとき（3日前から毎朝8時）"
              />
              <Switch
                {...weeklyField.props}
                checked={weeklyField.input ?? settings.triggers.weeklyTargetMiss}
                label="週間ターゲットが未達のとき（土曜9時）"
              />
              <Switch
                {...eveningField.props}
                checked={eveningField.input ?? settings.triggers.eveningUntouched}
                label="夜に未着手が残っているとき"
              />
            </Stack>
          </Fieldset>
          <Select
            allowDeselect={false}
            data={eveningHourOptions()}
            error={eveningHourField.errors?.[0]}
            ff={NUMERAL_FONT}
            label="夜の催促の時刻"
            onChange={onRequiredSelect((value) => {
              eveningHourField.onChange(Number(value));
            })}
            value={String(eveningHour)}
          />
          <Stack gap={4}>
            <Group grow>
              <Select
                allowDeselect={false}
                data={quietHourOptions()}
                error={quietFromField.errors?.[0]}
                ff={NUMERAL_FONT}
                label="静穏時間の開始"
                onChange={onRequiredSelect((value) => {
                  quietFromField.onChange(Number(value));
                })}
                value={String(quietFrom)}
              />
              <Select
                allowDeselect={false}
                data={quietHourOptions()}
                error={quietToField.errors?.[0]}
                ff={NUMERAL_FONT}
                label="静穏時間の終了"
                onChange={onRequiredSelect((value) => {
                  quietToField.onChange(Number(value));
                })}
                value={String(quietTo)}
              />
            </Group>
            <Text c="dimmed" size="xs">
              {QUIET_HOURS_HINT}
            </Text>
          </Stack>
          <Button type="submit">保存</Button>
        </Stack>
      </Form>
    </Stack>
  );
}
