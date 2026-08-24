import { Form, useField, useForm } from "@formisch/react";
import {
  Alert,
  Button,
  Fieldset,
  Group,
  PasswordInput,
  Select,
  Stack,
  Switch,
  Text,
} from "@mantine/core";
import {
  isQuietHourJst,
  SLACK_FAILURE_STREAK_LIMIT,
  SLACK_REQUIRED_MESSAGE,
} from "~domain/notifications";
import type { NotificationSettingsDto } from "~domain/validators";

import { eveningHourOptions, quietHourOptions } from "~/features/my-page/lib/hour-options";
import {
  type NotificationSettingsFormOutput,
  NotificationSettingsSchema,
} from "~/features/my-page/schemas/notification-settings-schema";
import type { SaveNotificationSettingsInput } from "~/features/my-page/types/notification-settings";
import { onRequiredSelect } from "~/lib/select";
import { NUMERAL_FONT } from "~/lib/theme";

type NotificationSettingsFormProps = {
  onDisconnectSlack: () => void;
  onSave: (input: SaveNotificationSettingsInput) => void;
  settings: NotificationSettingsDto;
};

//* 1フォーム＋保存ボタン(target-form.tsx と同じ流儀)。Switch の即時保存は採らない —
//? 静穏の開始/終了と Webhook URL が同じフォームにあり、保存の粒度が2種類になると読めなくなる。
export function NotificationSettingsForm({
  onDisconnectSlack,
  onSave,
  settings,
}: NotificationSettingsFormProps) {
  const form = useForm({
    initialInput: {
      enabled: settings.enabled,
      eveningHourJst: settings.eveningHourJst,
      quietFromHourJst: settings.quietFromHourJst,
      quietToHourJst: settings.quietToHourJst,
      slackEnabled: settings.slackEnabled,
      slackWebhookUrl: "",
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
  const slackEnabledField = useField(form, { path: ["slackEnabled"] });
  const webhookField = useField(form, { path: ["slackWebhookUrl"] });

  //? 初期描画では field.input が未確定になり得るので、フォールバックはサーバ由来の設定値にする。
  const enabled = enabledField.input ?? settings.enabled;
  const eveningHour = eveningHourField.input ?? settings.eveningHourJst;
  const quietFrom = quietFromField.input ?? settings.quietFromHourJst;
  const quietTo = quietToField.input ?? settings.quietToHourJst;
  const slackEnabled = slackEnabledField.input ?? settings.slackEnabled;
  const webhookInput = (webhookField.input ?? "").trim();
  const slackMissingUrl = slackEnabled && !settings.slackConfigured && webhookInput === "";
  const eveningInQuietWindow = isQuietHourJst(eveningHour, quietFrom, quietTo);

  return (
    <Stack gap="md">
      {enabled ? null : (
        <Alert color="yellow" variant="light">
          通知はまだ有効になっていません。
        </Alert>
      )}
      {settings.slackFailureStreak >= SLACK_FAILURE_STREAK_LIMIT ? (
        <Alert color="red" variant="light">
          Slack への送信が3回続けて失敗したため、連携を停止しました。URL を確認してください。
        </Alert>
      ) : null}
      {slackEnabled && eveningInQuietWindow ? (
        <Alert color="yellow" variant="light">
          夜の催促の時刻が静穏時間の中にあります。Slack へは送られません（通知欄には残ります）。
        </Alert>
      ) : null}
      <Form
        of={form}
        onSubmit={(output: NotificationSettingsFormOutput) => {
          const { slackWebhookUrl, ...rest } = output;
          //? 空欄は既存 URL を保つ。undefined のキーは引数から落とす。
          onSave(slackWebhookUrl === undefined ? rest : { ...rest, slackWebhookUrl });
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
          <Group align="flex-start" gap="sm" grow>
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
            静穏時間は Slack への送信だけを止めます。通知欄には残ります。
          </Text>
          <Fieldset legend="Slack へ送る">
            <Stack gap="sm">
              <Switch {...slackEnabledField.props} checked={slackEnabled} label="Slack へ送る" />
              <PasswordInput
                {...webhookField.props}
                description={
                  settings.slackConfigured
                    ? "設定済み。置き換えるときだけ入力してください。"
                    : undefined
                }
                error={
                  webhookField.errors?.[0] ?? (slackMissingUrl ? SLACK_REQUIRED_MESSAGE : undefined)
                }
                label="Incoming Webhook URL"
                value={webhookField.input ?? ""}
              />
              {settings.slackConfigured ? (
                <Button color="red" onClick={onDisconnectSlack} variant="subtle">
                  Slack 連携を解除
                </Button>
              ) : null}
            </Stack>
          </Fieldset>
          <Button disabled={slackMissingUrl} type="submit">
            保存
          </Button>
        </Stack>
      </Form>
    </Stack>
  );
}
