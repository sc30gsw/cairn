import { createFileRoute } from "@tanstack/react-router";

import { OwnerGate } from "~/features/auth/components/owner-gate";
import { DayPage } from "~/features/today/components/day-page";

export const Route = createFileRoute("/days/$dateJst")({
  component: DayRoute,
});

function DayRoute() {
  const { dateJst } = Route.useParams();
  return (
    <OwnerGate>
      <DayPage dateJst={dateJst} />
    </OwnerGate>
  );
}
