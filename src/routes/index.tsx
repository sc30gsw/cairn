import { createFileRoute } from "@tanstack/react-router";
import { todayJst } from "~domain/jst";

import { OwnerGate } from "~/features/auth/components/owner-gate";
import { DayPage } from "~/features/today/components/day-page";
import { daySearchMiddlewares, DaySearchSchema } from "~/features/today/lib/day-route-search";

export const Route = createFileRoute("/")({
  search: {
    middlewares: daySearchMiddlewares,
  },
  validateSearch: DaySearchSchema,
  component: HomeRoute,
});

function HomeRoute() {
  const { preset } = Route.useSearch();
  return (
    <OwnerGate>
      <DayPage dateJst={todayJst()} presetFromSearch={preset} />
    </OwnerGate>
  );
}
