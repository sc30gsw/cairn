import { createFileRoute } from "@tanstack/react-router";

import { OwnerGate } from "~/features/auth/components/owner-gate";
import { DatedDayPage } from "~/features/today/components/day-page";
import {
  datedDaySearchMiddlewares,
  DaySearchSchema,
} from "~/features/today/lib/day-route-search";

export const Route = createFileRoute("/days/$dateJst")({
  search: {
    middlewares: datedDaySearchMiddlewares,
  },
  validateSearch: DaySearchSchema,
  component: DayRoute,
});

function DayRoute() {
  return (
    <OwnerGate>
      <DatedDayPage />
    </OwnerGate>
  );
}
