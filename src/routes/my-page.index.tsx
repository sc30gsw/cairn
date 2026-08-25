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
      {/*? オンボーディングの補助情報は任意の小さな付加物。ページ全体サイズの Pending フォールバックはレイアウトシフトが大きい */}
      <Suspense fallback={null}>
        <MyPageOnboardingExtras />
      </Suspense>
    </Stack>
  );
}
