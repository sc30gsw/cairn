import { createFileRoute } from "@tanstack/react-router";

import { OwnerGate } from "~/features/auth/components/owner-gate";
import { PresetsPage } from "~/features/catalog/components/presets-page";
import { PresetSearchSchema } from "~/features/catalog/schemas/preset-search-schema";

export const Route = createFileRoute("/presets")({
  component: PresetsRoute,
  validateSearch: PresetSearchSchema,
});

function PresetsRoute() {
  return (
    <OwnerGate>
      <PresetsPage />
    </OwnerGate>
  );
}
