import { SETUP_STEP_IDS, type SetupStepId } from "~/features/onboarding/lib/setup-steps";
import { tryLocalStorageGet, tryLocalStorageSet } from "~/lib/safe-storage";

const DISMISS_PREFIX = "cairn:onboarding:dismissed:";

export function isOnboardingDismissStorageKey(key: string | null): boolean {
  return key?.startsWith(DISMISS_PREFIX) ?? false;
}

export function onboardingDismissKey(stepId: SetupStepId): string {
  return `${DISMISS_PREFIX}${stepId}`;
}

export function readDismissedSetupSteps(): Set<SetupStepId> {
  if (typeof window === "undefined") {
    return new Set();
  }

  const dismissed = new Set<SetupStepId>();
  for (const stepId of SETUP_STEP_IDS) {
    if (tryLocalStorageGet(onboardingDismissKey(stepId)) === "1") {
      dismissed.add(stepId);
    }
  }
  return dismissed;
}

export function dismissSetupStep(stepId: SetupStepId): void {
  if (typeof window === "undefined") {
    return;
  }
  tryLocalStorageSet(onboardingDismissKey(stepId), "1");
}
