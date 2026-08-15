import { createFileRoute } from "@tanstack/react-router";

import { OwnerGate } from "~/features/auth/components/owner-gate";
import { DayPage } from "~/features/today/components/day-page";
import { dayRouteSearch } from "~/features/today/lib/day-route-search";

export const Route = createFileRoute("/days/$dateJst")({
  ...dayRouteSearch,
  component: DayRoute,
});

function DayRoute() {
  const { dateJst } = Route.useParams();
  const { preset } = Route.useSearch();
  return (
    <OwnerGate>
      <DayPage dateJst={dateJst} presetFromSearch={preset} />
    </OwnerGate>
  );
}
