import { createFileRoute } from "@tanstack/react-router";

import { OwnerGate } from "~/features/auth/components/owner-gate";
import { GoalsPage } from "~/features/goals/components/goals-page";

export const Route = createFileRoute("/goals")({
  component: GoalsRoute,
});

function GoalsRoute() {
  return (
    <OwnerGate>
      <GoalsPage />
    </OwnerGate>
  );
}
