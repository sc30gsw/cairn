import { createFileRoute } from "@tanstack/react-router";

import { OwnerGate } from "~/features/auth/components/owner-gate";
import { TrashPage } from "~/features/trash/components/trash-page";

export const Route = createFileRoute("/trash")({
  component: TrashRoute,
});

function TrashRoute() {
  return (
    <OwnerGate>
      <TrashPage />
    </OwnerGate>
  );
}
