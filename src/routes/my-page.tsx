import { Stack } from "@mantine/core";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";

import { PendingComponent } from "~/components/pending-component";
import { OwnerGate } from "~/features/auth/components/owner-gate";
import { MyPage } from "~/features/my-page/components/my-page";
import { MyPagePasskeyReprompt } from "~/features/my-page/components/my-page-passkey-reprompt";
import { MyPageOnboardingExtras } from "~/features/onboarding/components/my-page-onboarding-extras";

export const Route = createFileRoute("/my-page")({
  component: MyPageRoute,
});

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
