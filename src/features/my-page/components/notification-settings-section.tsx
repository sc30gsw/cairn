import { Card, Stack, Text, Title } from "@mantine/core";
import { modals } from "@mantine/modals";

import { NotificationSettingsForm } from "~/features/my-page/components/notification-settings-form";
import type { SaveNotificationSettingsInput } from "~/features/my-page/types/notification-settings";
import { useNotificationSettings } from "~/hooks/use-notification-inbox";
import {
  useDisconnectSlack,
  useSaveNotificationSettings,
} from "~/hooks/use-notification-mutations";
import { runMutation } from "~/lib/run-mutation";

export function NotificationSettingsSection() {
  const { data: settings } = useNotificationSettings();
  const saveSettings = useSaveNotificationSettings();
  const disconnectSlack = useDisconnectSlack();

  function save(input: SaveNotificationSettingsInput) {
    void runMutation(() => saveSettings.mutateAsync(input), {
      errorMessage: "通知の設定を保存できませんでした",
      successMessage: "通知の設定を保存しました",
    });
  }

  //? 破壊的操作なので確認を出す(既存の流儀)。URL は再入力できるので取り返しは付く。
  function requestDisconnectSlack() {
    modals.openConfirmModal({
      children: (
        <Text size="sm">
          Webhook URL を削除し、Slack への送信を止めます。あとから再設定できます。
        </Text>
      ),
      confirmProps: { color: "red" },
      labels: { cancel: "キャンセル", confirm: "解除する" },
      onConfirm: () => {
        void runMutation(() => disconnectSlack.mutateAsync({}), {
          errorMessage: "Slack 連携を解除できませんでした",
          successMessage: "Slack 連携を解除しました",
        });
      },
      title: "Slack 連携を解除しますか？",
    });
  }

  return (
    <Card padding="md">
      <Stack gap="md">
        <Title order={2}>通知</Title>
        <Text c="dimmed" size="sm">
          決めた時刻に催促を作ります。既定では通知欄にだけ出ます。
        </Text>
        <NotificationSettingsForm
          onDisconnectSlack={requestDisconnectSlack}
          onSave={save}
          settings={settings}
        />
      </Stack>
    </Card>
  );
}
