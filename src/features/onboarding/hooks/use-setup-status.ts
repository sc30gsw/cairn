import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";

import { api } from "~/../convex/_generated/api";
import {
  dismissedSetFromSnapshotKey,
  getDismissedSetupServerSnapshot,
  getDismissedSetupSnapshot,
  notifyDismissedSetupChanged,
  subscribeToDismissedSetup,
} from "~/features/onboarding/lib/dismissed-setup-store";
import { dismissSetupStep as persistDismissSetupStep } from "~/features/onboarding/lib/onboarding-storage";
import {
  firstIncompleteSetupStep,
  shouldShowHomeSetupStepper,
  type SetupStep,
  type SetupStepId,
} from "~/features/onboarding/lib/setup-steps";
import type { SetupStatus } from "~/features/onboarding/types/setup-status";

export function useSetupStatus(): {
  dismissStep: (stepId: SetupStepId) => void;
  dismissed: Set<SetupStepId>;
  firstStep: SetupStep | null;
  showHomeStepper: boolean;
  status: SetupStatus;
} {
  const { data: status } = useSuspenseQuery(convexQuery(api.queries.setup.status.status, {}));
  const dismissedKey = useSyncExternalStore(
    subscribeToDismissedSetup,
    getDismissedSetupSnapshot,
    getDismissedSetupServerSnapshot,
  );
  const dismissed = dismissedSetFromSnapshotKey(dismissedKey);

  const firstStep = firstIncompleteSetupStep(status, dismissed);

  return {
    dismissStep: (stepId: SetupStepId) => {
      persistDismissSetupStep(stepId);
      notifyDismissedSetupChanged();
    },
    dismissed,
    firstStep,
    showHomeStepper: shouldShowHomeSetupStepper(status, dismissed),
    status,
  };
}
