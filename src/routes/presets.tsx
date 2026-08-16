import { createFileRoute } from "@tanstack/react-router";

import { OwnerGate } from "~/features/auth/components/owner-gate";
import { PresetsPage } from "~/features/catalog/components/presets-page";

export const Route = createFileRoute("/presets")({
  component: PresetsRoute,
});

function PresetsRoute() {
  return (
    <OwnerGate>
      <PresetsPage />
    </OwnerGate>
  );
}
