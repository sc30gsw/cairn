import { Stack } from "@mantine/core";
import { createFileRoute } from "@tanstack/react-router";

import { OwnerGate } from "~/features/auth/components/owner-gate";
import { GoalsPage } from "~/features/goals/components/goals-page";
import { MethodCatalogSection } from "~/features/methods/components/method-catalog-section";

export const Route = createFileRoute("/goals")({
  component: GoalsRoute,
});

//? 方法カタログは目標(障害プラン)の近くに置く下段セクション。feature 間 import を避けるため、
//? 合成は route が担う(routes は features を import してよい — project-structure.md)。
function GoalsRoute() {
  return (
    <OwnerGate>
      <Stack gap="xl">
        <GoalsPage />
        <MethodCatalogSection />
      </Stack>
    </OwnerGate>
  );
}
