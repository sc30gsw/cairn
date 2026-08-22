import { Stack } from "@mantine/core";
import { Suspense, useState } from "react";
import type { DateJst } from "~domain/jst";
import { mondayOfWeek, todayJst } from "~domain/jst";

import { PendingComponent } from "~/components/pending-component";
import { SetupStepper } from "~/features/onboarding/components/setup-stepper";
import { useSetupStatus } from "~/features/onboarding/hooks/use-setup-status";
import { DayBoard } from "~/features/today/components/day-board";
import {
  useItemsList,
  usePresetsList,
  useTargetsWithProgress,
} from "~/features/today/hooks/day-queries";
import { targetRemainder, targetRemainderMessage } from "~/features/today/lib/target-remainder";
import type { DaySearch } from "~/features/today/schemas/day-search-schema";
import { useOpenAndLoadDay } from "~/hooks/use-open-and-load-day";

type DayBoardTabProps = {
  dateJst: DateJst;
  presetFromSearch?: DaySearch["preset"];
};

function DayBoardOnboarding() {
  const { dismissStep, firstStep, showHomeStepper } = useSetupStatus();
  if (!showHomeStepper || firstStep === null) {
    return null;
  }
  return <SetupStepper activeStep={firstStep} onDismiss={() => dismissStep(firstStep.id)} />;
}

export function DayBoardTab({ dateJst, presetFromSearch }: DayBoardTabProps) {
  const today = todayJst();
  const { data: day } = useOpenAndLoadDay(dateJst, today);
  const { data: items } = useItemsList();
  const { data: presets } = usePresetsList();
  const { data: targets } = useTargetsWithProgress(mondayOfWeek(today));
  const [confirmedCategory, setConfirmedCategory] = useState<string | null>(null);

  const remainder =
    confirmedCategory === null || mondayOfWeek(dateJst) !== mondayOfWeek(today)
      ? null
      : targetRemainder(targets, confirmedCategory);

  return (
    <Stack gap="md">
      <Suspense fallback={<PendingComponent />}>
        <DayBoardOnboarding />
      </Suspense>
      <DayBoard
        dateJst={dateJst}
        day={day}
        items={items}
        onConfirmedCategory={setConfirmedCategory}
        presetFromSearch={presetFromSearch}
        presets={presets}
        remainderMessage={remainder === null ? null : targetRemainderMessage(remainder)}
        todayJst={today}
      />
    </Stack>
  );
}
