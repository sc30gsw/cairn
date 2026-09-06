import { Card, Stack, Title } from "@mantine/core";
import { Suspense } from "react";

import { CALENDAR_SYNC_TITLE, CalendarSyncSection } from "~/components/calendar-sync-section";
import { PendingComponent } from "~/components/pending-component";
import { AccountSection } from "~/features/my-page/components/account-section";
import { PasskeySection } from "~/features/my-page/components/passkey-section";
import { ProfileSection } from "~/features/my-page/components/profile-section";
import { useAppShellUser } from "~/hooks/use-auth-session";

function MyPageAccountContent() {
  const user = useAppShellUser();

  if (user === null) {
    return null;
  }

  return (
    <Stack gap="md">
      <ProfileSection />
      <AccountSection />
      <PasskeySection />
      <Card padding="md">
        <Title mb="md" order={3}>
          {CALENDAR_SYNC_TITLE}
        </Title>
        <Suspense fallback={<PendingComponent />}>
          <CalendarSyncSection />
        </Suspense>
      </Card>
    </Stack>
  );
}

export function MyPageAccount() {
  return (
    <Suspense fallback={<PendingComponent />}>
      <MyPageAccountContent />
    </Suspense>
  );
}
