import { Card, Stack, Text, Title } from "@mantine/core";

import { NotificationSettingsForm } from "~/features/my-page/components/notification-settings-form";
import type { SaveNotificationSettingsInput } from "~/features/my-page/types/notification-settings";
import { useNotificationSettings } from "~/hooks/use-notification-inbox";
import { useSaveNotificationSettings } from "~/hooks/use-notification-mutations";
import { runMutation } from "~/lib/run-mutation";

export function NotificationSettingsSection() {
  const { data: settings } = useNotificationSettings();
  const saveSettings = useSaveNotificationSettings();

  function save(input: SaveNotificationSettingsInput) {
    void runMutation(() => saveSettings.mutateAsync(input), {
      errorMessage: "通知の設定を保存できませんでした",
      successMessage: "通知の設定を保存しました",
    });
  }

  return (
    <Card padding="md">
      <Stack gap="md">
        <Title order={2}>通知</Title>
        <Text c="dimmed" size="sm">
          決めた時刻に催促を作ります。通知欄に出ます。
        </Text>
        <NotificationSettingsForm onSave={save} settings={settings} />
      </Stack>
    </Card>
  );
}
