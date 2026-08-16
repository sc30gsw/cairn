import { createFileRoute, redirect } from "@tanstack/react-router";
import { todayJst } from "~domain/jst";

import { OwnerGate } from "~/features/auth/components/owner-gate";
import { DatedDayPage } from "~/features/today/components/day-page";
import {
  daySearchMiddlewares,
  DaySearchSchema,
  shouldStripDatedDayPreset,
} from "~/features/today/lib/day-route-search";

export const Route = createFileRoute("/days/$dateJst")({
  beforeLoad: ({ location, params }) => {
    if (shouldStripDatedDayPreset(params.dateJst, location.search.preset, todayJst())) {
      throw redirect({
        params,
        replace: true,
        search: { ...location.search, preset: undefined },
        to: "/days/$dateJst",
      });
    }
  },
  search: {
    middlewares: daySearchMiddlewares,
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
