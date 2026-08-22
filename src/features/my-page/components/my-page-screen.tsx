import { Stack } from "@mantine/core";
import { Suspense, useState } from "react";

import { PendingComponent } from "~/components/pending-component";
import { OwnerGate } from "~/features/auth/components/owner-gate";
import { PasskeyPromptModal } from "~/features/auth/components/passkey-prompt-modal";
import { MyPage } from "~/features/my-page/components/my-page";
import { CatalogSamplesPreview } from "~/features/onboarding/components/catalog-samples-preview";
import { SetupChecklist } from "~/features/onboarding/components/setup-checklist";
import { useSetupStatus } from "~/features/onboarding/hooks/use-setup-status";
import { shouldOpenMyPagePasskeyPrompt } from "~/lib/passkey-storage";

function MyPageOnboardingExtras() {
  const { status } = useSetupStatus();

  if (status.isComplete) {
    return <CatalogSamplesPreview />;
  }

  return (
    <>
      <SetupChecklist />
      <CatalogSamplesPreview />
    </>
  );
}

function MyPagePasskeyReprompt() {
  const [opened, setOpened] = useState(shouldOpenMyPagePasskeyPrompt);

  return <PasskeyPromptModal context="mypage" onClose={() => setOpened(false)} opened={opened} />;
}

export function MyPageScreen() {
  return (
    <OwnerGate>
      <Stack gap="md">
        <MyPage />
        <Suspense fallback={<PendingComponent />}>
          <MyPageOnboardingExtras />
        </Suspense>
      </Stack>
      <MyPagePasskeyReprompt />
    </OwnerGate>
  );
}
