import { createFileRoute } from "@tanstack/react-router";

import { OwnerGate } from "~/features/auth/components/owner-gate";
import { MethodCatalogSection } from "~/features/methods/components/method-catalog-section";

export const Route = createFileRoute("/methods")({
  component: MethodsRoute,
});

function MethodsRoute() {
  return (
    <OwnerGate>
      <MethodCatalogSection />
    </OwnerGate>
  );
}
