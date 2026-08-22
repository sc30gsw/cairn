import { Stack, Title } from "@mantine/core";
import { Suspense } from "react";

import { PendingComponent } from "~/components/pending-component";
import { AccountSection } from "~/features/my-page/components/account-section";
import { PasskeySection } from "~/features/my-page/components/passkey-section";
import { ProfileSection } from "~/features/my-page/components/profile-section";
import { TodaySummarySection } from "~/features/my-page/components/today-summary-section";
import { useAppShellUser } from "~/hooks/use-auth-session";

function MyPageContent() {
  const user = useAppShellUser();

  if (user === null) {
    return null;
  }

  return (
    <Stack gap="md">
      <Title order={1}>マイページ</Title>
      <ProfileSection />
      <AccountSection />
      <PasskeySection />
      <Suspense fallback={<PendingComponent />}>
        <TodaySummarySection />
      </Suspense>
    </Stack>
  );
}

export function MyPage() {
  return (
    <Suspense fallback={<PendingComponent />}>
      <MyPageContent />
    </Suspense>
  );
}
