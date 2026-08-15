import { createFileRoute } from "@tanstack/react-router";
import { todayJst } from "~domain/jst";

import { OwnerGate } from "~/features/auth/components/owner-gate";
import { DayPage } from "~/features/today/components/day-page";

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
