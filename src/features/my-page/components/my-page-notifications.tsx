import { Suspense } from "react";

import { PendingComponent } from "~/components/pending-component";
import { NotificationSettingsSection } from "~/features/my-page/components/notification-settings-section";

export function MyPageNotifications() {
  return (
    <Suspense fallback={<PendingComponent />}>
      <NotificationSettingsSection />
    </Suspense>
  );
}
