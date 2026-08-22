import { beforeEach, expect, test, vi } from "vite-plus/test";

import {
  dismissedSetFromSnapshotKey,
  getDismissedSetupServerSnapshot,
  getDismissedSetupSnapshot,
  notifyDismissedSetupChanged,
  resetDismissedSetupStoreForTests,
  subscribeToDismissedSetup,
} from "~/features/onboarding/lib/dismissed-setup-store";
import {
  dismissSetupStep,
  onboardingDismissKey,
} from "~/features/onboarding/lib/onboarding-storage";

beforeEach(() => {
  resetDismissedSetupStoreForTests();
});

test("getDismissedSetupServerSnapshot は SSR 用に空文字を返す", () => {
  expect(getDismissedSetupServerSnapshot()).toBe("");
});

test("subscribe 後の microtask で localStorage から snapshot を同期する", async () => {
  const storage = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      storage.set(key, value);
    },
  });

  storage.set(onboardingDismissKey("items"), "1");

  expect(getDismissedSetupSnapshot()).toBe("");

  const unsubscribe = subscribeToDismissedSetup(() => {});
  await Promise.resolve();

  expect(getDismissedSetupSnapshot()).toBe("items");
  unsubscribe();
  vi.unstubAllGlobals();
});

test("notifyDismissedSetupChanged は同一 snapshot なら listener を呼ばない", async () => {
  const storage = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      storage.set(key, value);
    },
  });

  const listener = vi.fn();
  const unsubscribe = subscribeToDismissedSetup(listener);
  await Promise.resolve();
  listener.mockClear();

  notifyDismissedSetupChanged();
  expect(listener).not.toHaveBeenCalled();

  dismissSetupStep("presets");
  notifyDismissedSetupChanged();
  expect(listener).toHaveBeenCalledTimes(1);
  expect(getDismissedSetupSnapshot()).toBe("presets");

  unsubscribe();
  vi.unstubAllGlobals();
});

test("dismissedSetFromSnapshotKey は空文字を空 Set に変換する", () => {
  expect(dismissedSetFromSnapshotKey("")).toEqual(new Set());
  expect(dismissedSetFromSnapshotKey("items|presets")).toEqual(new Set(["items", "presets"]));
});

test("onboarding 以外の storage イベントでは listener を呼ばない", async () => {
  const listener = vi.fn();
  const unsubscribe = subscribeToDismissedSetup(listener);
  await Promise.resolve();
  listener.mockClear();

  window.dispatchEvent(
    new StorageEvent("storage", { key: "cairn:passkey:signup-skipped", newValue: "1" }),
  );
  expect(listener).not.toHaveBeenCalled();

  unsubscribe();
});
