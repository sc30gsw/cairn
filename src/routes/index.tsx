import { createFileRoute } from "@tanstack/react-router";

import { OwnerGate } from "~/features/auth/components/owner-gate";
import { TodayDayPage } from "~/features/today/components/day-page";
import { daySearchMiddlewares, DaySearchSchema } from "~/features/today/lib/day-route-search";

export const Route = createFileRoute("/")({
  validateSearch: DaySearchSchema,
  search: {
    middlewares: daySearchMiddlewares,
  },
  component: HomeRoute,
});

function HomeRoute() {
  return (
    <OwnerGate>
      <TodayDayPage />
    </OwnerGate>
  );
}
