import { createFileRoute, redirect } from "@tanstack/react-router";
import * as v from "valibot";
import { todayJst } from "~domain/jst";

import { OwnerGate } from "~/features/auth/components/owner-gate";
import { DatedDayPage } from "~/features/today/components/day-page";
import {
  daySearchMiddlewares,
  DaySearchSchema,
  shouldStripDatedDayPreset,
} from "~/features/today/lib/day-route-search";

export const Route = createFileRoute("/days/$dateJst")({
  validateSearch: DaySearchSchema,
  search: {
    middlewares: daySearchMiddlewares,
  },
  beforeLoad: ({ location, params }) => {
    const parsedSearch = v.safeParse(DaySearchSchema, location.search);
    if (
      parsedSearch.success &&
      shouldStripDatedDayPreset(params.dateJst, parsedSearch.output.preset, todayJst())
    ) {
      throw redirect({
        params,
        replace: true,
        search: { ...parsedSearch.output, preset: undefined },
        to: "/days/$dateJst",
      });
    }
  },
  component: DayRoute,
});

function DayRoute() {
  return (
    <OwnerGate>
      <DatedDayPage />
    </OwnerGate>
  );
}
