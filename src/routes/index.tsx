import { createFileRoute } from "@tanstack/react-router";

import { OwnerGate } from "~/features/auth/components/owner-gate";
import { DayPage } from "~/features/today/components/day-page";
import { todayJst } from "~/lib/date-jst";

export const Route = createFileRoute("/")({
  component: HomeRoute,
});

function HomeRoute() {
  return (
    <OwnerGate>
      <DayPage dateJst={todayJst()} />
    </OwnerGate>
  );
}
