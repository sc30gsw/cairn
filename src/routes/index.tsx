import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";

import { OwnerGate } from "~/features/auth/components/owner-gate";
import { SetupStepper } from "~/features/onboarding/components/setup-stepper";
import { useSetupStatus } from "~/features/onboarding/hooks/use-setup-status";
import { TodayDayPage } from "~/features/today/components/day-page";
import { daySearchMiddlewares, DaySearchSchema } from "~/features/today/lib/day-route-search";

export const Route = createFileRoute("/")({
  validateSearch: DaySearchSchema,
  search: {
    middlewares: daySearchMiddlewares,
  },
  component: HomeRoute,
});

function HomeSetupStepper() {
  const { dismissStep, firstStep, showHomeStepper } = useSetupStatus();

  if (!showHomeStepper || firstStep === null) {
    return null;
  }

  return <SetupStepper activeStep={firstStep} onDismiss={() => dismissStep(firstStep.id)} />;
}

function HomeRoute() {
  return (
    <OwnerGate>
      <Suspense fallback={null}>
        <HomeSetupStepper />
      </Suspense>
      <TodayDayPage />
    </OwnerGate>
  );
}
