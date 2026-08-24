import { Stack } from "@mantine/core";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";

import { PendingComponent } from "~/components/pending-component";
import { MyPageAccount } from "~/features/my-page/components/my-page-account";
import { MyPageOnboardingExtras } from "~/features/onboarding/components/my-page-onboarding-extras";

export const Route = createFileRoute("/my-page/")({
  component: MyPageAccountRoute,
});

function MyPageAccountRoute() {
  return (
    <Stack gap="md">
      <MyPageAccount />
      <Suspense fallback={<PendingComponent />}>
        <MyPageOnboardingExtras />
      </Suspense>
    </Stack>
  );
}
