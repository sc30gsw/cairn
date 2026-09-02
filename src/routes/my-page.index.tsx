import { Stack } from "@mantine/core";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";

import { MyPageAccount } from "~/features/my-page/components/my-page-account";
import { MyPageOnboardingExtras } from "~/features/onboarding/components/my-page-onboarding-extras";

export const Route = createFileRoute("/my-page/")({
  component: MyPageAccountRoute,
});

function MyPageAccountRoute() {
  return (
    <Stack gap="md">
      <MyPageAccount />
      {/*? checklist とカタログ例は条件付きで出る補助なので、骨組みを見せる Shimmer は置かない（#80） */}
      <Suspense fallback={null}>
        <MyPageOnboardingExtras />
      </Suspense>
    </Stack>
  );
}
