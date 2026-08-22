import { Stack } from "@mantine/core";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";

import { PendingComponent } from "~/components/pending-component";
import { MyPagePasskeyReprompt } from "~/features/auth/components/my-page-passkey-reprompt";
import { OwnerGate } from "~/features/auth/components/owner-gate";
import { MyPage } from "~/features/my-page/components/my-page";
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
