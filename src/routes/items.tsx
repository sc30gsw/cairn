import { createFileRoute } from "@tanstack/react-router";

import { OwnerGate } from "~/features/auth/components/owner-gate";
import { ItemsPage } from "~/features/catalog/components/items-page";

export const Route = createFileRoute("/items")({
  component: ItemsRoute,
});

function ItemsRoute() {
  return (
    <OwnerGate>
      <ItemsPage />
    </OwnerGate>
  );
}
