import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";

import { api } from "~/../convex/_generated/api";
import {
  readDismissedSetupSteps,
  dismissSetupStep as persistDismissSetupStep,
} from "~/features/onboarding/lib/onboarding-storage";
import {
  firstIncompleteSetupStep,
  shouldShowHomeSetupStepper,
  type SetupStep,
  type SetupStepId,
} from "~/features/onboarding/lib/setup-steps";
import type { SetupStatus } from "~/features/onboarding/types/setup-status";

function subscribeToDismissed(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener("cairn:onboarding-dismissed", onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener("cairn:onboarding-dismissed", onStoreChange);
  };
}

function dismissedSnapshotKey(): string {
  const dismissedIds = Array.from(readDismissedSetupSteps());
  dismissedIds.sort();
  return dismissedIds.join("|");
}

function dismissedSetFromKey(key: string): Set<SetupStepId> {
  if (key === "") {
    return new Set();
  }
  return new Set(key.split("|") as SetupStepId[]);
}

export function useSetupStatus(): {
  dismissStep: (stepId: SetupStepId) => void;
  dismissed: Set<SetupStepId>;
  firstStep: SetupStep | null;
  showHomeStepper: boolean;
  status: SetupStatus;
} {
  const { data: status } = useSuspenseQuery(convexQuery(api.queries.setup.status.status, {}));
  const dismissedKey = useSyncExternalStore(subscribeToDismissed, dismissedSnapshotKey, () => "");
  const dismissed = dismissedSetFromKey(dismissedKey);

  const firstStep = firstIncompleteSetupStep(status, dismissed);

  return {
    dismissStep: (stepId: SetupStepId) => {
      persistDismissSetupStep(stepId);
      window.dispatchEvent(new Event("cairn:onboarding-dismissed"));
    },
    dismissed,
    firstStep,
    showHomeStepper: shouldShowHomeSetupStepper(status, dismissed),
    status,
  };
}
