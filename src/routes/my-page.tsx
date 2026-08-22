import { Stack } from "@mantine/core";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense, useState } from "react";

import { PendingComponent } from "~/components/pending-component";
import { OwnerGate } from "~/features/auth/components/owner-gate";
import { PasskeyPromptModal } from "~/features/auth/components/passkey-prompt-modal";
import { MyPage } from "~/features/my-page/components/my-page";
import { CatalogSamplesPreview } from "~/features/onboarding/components/catalog-samples-preview";
import { SetupChecklist } from "~/features/onboarding/components/setup-checklist";
import { useSetupStatus } from "~/features/onboarding/hooks/use-setup-status";
import { shouldOpenMyPagePasskeyPrompt } from "~/lib/passkey-storage";

export const Route = createFileRoute("/my-page")({
  component: MyPageRoute,
});

function MyPageOnboardingExtras() {
  const { status } = useSetupStatus();

  if (status.isComplete) {
    return <CatalogSamplesPreview />;
  }

  return (
    <>
      <SetupChecklist status={status} />
      <CatalogSamplesPreview />
    </>
  );
}

function MyPagePasskeyReprompt() {
  const [opened, setOpened] = useState(shouldOpenMyPagePasskeyPrompt);

  return <PasskeyPromptModal context="mypage" onClose={() => setOpened(false)} opened={opened} />;
}

function MyPageRoute() {
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
