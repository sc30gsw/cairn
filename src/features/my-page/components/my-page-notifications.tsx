import { Stack } from "@mantine/core";
import { Suspense } from "react";

import { PendingComponent } from "~/components/pending-component";
import { NotificationSettingsSection } from "~/features/my-page/components/notification-settings-section";
import { WebPushSection } from "~/features/my-page/components/web-push-section";

export function MyPageNotifications() {
  return (
    <Stack gap="md">
      <Suspense fallback={<PendingComponent />}>
        <NotificationSettingsSection />
      </Suspense>
      <Suspense fallback={<PendingComponent />}>
        <WebPushSection />
      </Suspense>
    </Stack>
  );
}
