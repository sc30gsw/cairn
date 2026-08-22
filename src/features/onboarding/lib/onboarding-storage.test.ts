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

test("readPasskeyFlag / writePasskeyFlag は localStorage を使う", async () => {
  const { readPasskeyFlag, writePasskeyFlag, PASSKEY_SIGNUP_PROMPT_KEY } =
    await import("~/features/onboarding/lib/onboarding-storage");
  const storage = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => storage.get(key) ?? null,
    removeItem: (key: string) => {
      storage.delete(key);
    },
    setItem: (key: string, value: string) => {
      storage.set(key, value);
    },
  });

  expect(readPasskeyFlag(PASSKEY_SIGNUP_PROMPT_KEY)).toBe(false);
  writePasskeyFlag(PASSKEY_SIGNUP_PROMPT_KEY, true);
  expect(readPasskeyFlag(PASSKEY_SIGNUP_PROMPT_KEY)).toBe(true);
  writePasskeyFlag(PASSKEY_SIGNUP_PROMPT_KEY, false);
  expect(readPasskeyFlag(PASSKEY_SIGNUP_PROMPT_KEY)).toBe(false);
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
