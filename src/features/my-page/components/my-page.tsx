import { Stack, Title } from "@mantine/core";
import { Suspense, useEffect, useState } from "react";

import { PendingComponent } from "~/components/pending-component";
import { useAppShellUser } from "~/features/auth/hooks/use-auth-session";
import { AccountSection } from "~/features/my-page/components/account-section";
import { PasskeyPromptModal } from "~/features/my-page/components/passkey-prompt-modal";
import { PasskeySection } from "~/features/my-page/components/passkey-section";
import { ProfileSection } from "~/features/my-page/components/profile-section";
import { TodaySummarySection } from "~/features/my-page/components/today-summary-section";
import { CatalogSamplesPreview } from "~/features/onboarding/components/catalog-samples-preview";
import { SetupChecklist } from "~/features/onboarding/components/setup-checklist";
import { useSetupStatus } from "~/features/onboarding/hooks/use-setup-status";
import {
  PASSKEY_MYPAGE_REPROMPTED_KEY,
  PASSKEY_SIGNUP_SKIPPED_KEY,
  readPasskeyFlag,
} from "~/features/onboarding/lib/onboarding-storage";

function MyPageContent() {
  const user = useAppShellUser();
  const { status } = useSetupStatus();
  const [passkeyPromptOpen, setPasskeyPromptOpen] = useState(false);

  useEffect(() => {
    const skippedSignup = readPasskeyFlag(PASSKEY_SIGNUP_SKIPPED_KEY);
    const reprompted = readPasskeyFlag(PASSKEY_MYPAGE_REPROMPTED_KEY);
    if (skippedSignup && !reprompted) {
      setPasskeyPromptOpen(true);
    }
  }, []);

  if (user === null) {
    return null;
  }

  return (
    <>
      <Stack gap="md">
        <Title order={1}>マイページ</Title>
        <ProfileSection user={user} />
        <AccountSection user={user} />
        <PasskeySection />
        <Suspense fallback={<PendingComponent />}>
          <TodaySummarySection />
        </Suspense>
        {!status.isComplete ? <SetupChecklist status={status} /> : null}
        <CatalogSamplesPreview />
      </Stack>
      <PasskeyPromptModal
        context="mypage"
        onClose={() => setPasskeyPromptOpen(false)}
        opened={passkeyPromptOpen}
      />
    </>
  );
}

export function MyPage() {
  return (
    <Suspense fallback={<PendingComponent />}>
      <MyPageContent />
    </Suspense>
  );
}
