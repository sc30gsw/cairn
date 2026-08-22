import { expect, test, vi } from "vite-plus/test";

import {
  dismissSetupStep,
  onboardingDismissKey,
  readDismissedSetupSteps,
} from "~/features/onboarding/lib/onboarding-storage";

test("onboardingDismissKey は stepId を含む", () => {
  expect(onboardingDismissKey("items")).toBe("cairn:onboarding:dismissed:items");
});

test("readDismissedSetupSteps は localStorage を読む", () => {
  const storage = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      storage.set(key, value);
    },
  });
  storage.set(onboardingDismissKey("presets"), "1");
  expect(readDismissedSetupSteps().has("presets")).toBe(true);
  vi.unstubAllGlobals();
});

test("dismissSetupStep は localStorage に書き込む", () => {
  const storage = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      storage.set(key, value);
    },
  });
  dismissSetupStep("items");
  expect(storage.get(onboardingDismissKey("items"))).toBe("1");
  vi.unstubAllGlobals();
});
