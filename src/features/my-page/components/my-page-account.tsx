import { Stack } from "@mantine/core";
import { Suspense } from "react";

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
