import type { SetupStepId } from "~/features/onboarding/lib/setup-steps";

const DISMISS_PREFIX = "cairn:onboarding:dismissed:";

export function onboardingDismissKey(stepId: SetupStepId): string {
  return `${DISMISS_PREFIX}${stepId}`;
}

export function readDismissedSetupSteps(): Set<SetupStepId> {
  if (typeof window === "undefined") {
    return new Set();
  }

  const dismissed = new Set<SetupStepId>();
  for (const stepId of ["items", "presets", "examGoal", "weeklyTargets"] as const) {
    try {
      if (localStorage.getItem(onboardingDismissKey(stepId)) === "1") {
        dismissed.add(stepId);
      }
    } catch {
      // private browsing
    }
  }
  return dismissed;
}

export function dismissSetupStep(stepId: SetupStepId): void {
  try {
    localStorage.setItem(onboardingDismissKey(stepId), "1");
  } catch {
    // private browsing
  }
}

export const PASSKEY_SIGNUP_SKIPPED_KEY = "cairn:passkey:signup-skipped";
export const PASSKEY_SIGNUP_PROMPT_KEY = "cairn:passkey:show-after-signup";
export const PASSKEY_MYPAGE_REPROMPTED_KEY = "cairn:passkey:mypage-reprompted";

export function readPasskeyFlag(key: string): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

export function writePasskeyFlag(key: string, value: boolean): void {
  try {
    if (value) {
      localStorage.setItem(key, "1");
    } else {
      localStorage.removeItem(key);
    }
  } catch {
    // private browsing
  }
}
