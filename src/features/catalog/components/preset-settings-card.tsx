import { Card, Switch } from "@mantine/core";

import { useSavePresetSettings } from "~/features/catalog/hooks/catalog-mutations";
import { usePresetSettings } from "~/features/catalog/hooks/catalog-queries";
import { runMutation } from "~/lib/run-mutation";

export const HOLIDAY_AS_SUNDAY_LABEL = "祝日は日曜のプリセットを使う";

export function PresetSettingsCard() {
  const { data: settings } = usePresetSettings();
  const saveSettings = useSavePresetSettings();

  return (
    <Card padding="md">
      <Switch
        checked={settings.holidayAsSunday}
        description="日本の祝日に今日を開いたとき、曜日のプリセットではなく日曜のプリセットが並びます。"
        label={HOLIDAY_AS_SUNDAY_LABEL}
        onChange={(event) => {
          const holidayAsSunday = event.currentTarget.checked;
          void runMutation(() => saveSettings.mutateAsync({ holidayAsSunday }), {
            successMessage: holidayAsSunday
              ? "祝日は日曜のプリセットを使います"
              : "祝日も曜日のプリセットを使います",
          });
        }}
      />
    </Card>
  );
}
