import { createFileRoute } from "@tanstack/react-router";

import { OwnerGate } from "~/features/auth/components/owner-gate";
import { PlanPage } from "~/features/plan/components/plan-page";
import { planSearchMiddlewares, PlanSearchSchema } from "~/features/plan/lib/plan-route-search";

export const Route = createFileRoute("/plan")({
  validateSearch: PlanSearchSchema,
  search: {
    middlewares: planSearchMiddlewares,
  },
  component: PlanRoute,
});

function PlanRoute() {
  return (
    <OwnerGate>
      <PlanPage />
    </OwnerGate>
  );
}
