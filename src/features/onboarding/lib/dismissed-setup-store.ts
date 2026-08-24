import {
  isOnboardingDismissStorageKey,
  readDismissedSetupSteps,
} from "~/features/onboarding/lib/onboarding-storage";
import type { SetupStepId } from "~/features/onboarding/lib/setup-steps";

const DISMISSED_CHANGE_EVENT = "cairn:onboarding-dismissed";

let dismissedSnapshot = "";
const dismissedListeners = new Set<() => void>();

function computeDismissedSnapshotKey(): string {
  const dismissedIds = Array.from(readDismissedSetupSteps());
  dismissedIds.sort();
  return dismissedIds.join("|");
}

function syncDismissedSnapshotFromStorage(): boolean {
  const next = computeDismissedSnapshotKey();
  if (next === dismissedSnapshot) {
    return false;
  }
  dismissedSnapshot = next;
  return true;
}

function notifyDismissedListeners() {
  for (const listener of dismissedListeners) {
    listener();
  }
}

function subscribeToDismissedSetup(onStoreChange: () => void) {
  dismissedListeners.add(onStoreChange);

  if (typeof window !== "undefined") {
    queueMicrotask(() => {
      if (syncDismissedSnapshotFromStorage()) {
        onStoreChange();
      }
    });
  }

  const onStorage = (event: StorageEvent) => {
    if (!isOnboardingDismissStorageKey(event.key)) {
      return;
    }
    if (syncDismissedSnapshotFromStorage()) {
      notifyDismissedListeners();
    }
  };

  const onDismissedChange = () => {
    if (syncDismissedSnapshotFromStorage()) {
      notifyDismissedListeners();
    }
  };

  window.addEventListener("storage", onStorage);
  window.addEventListener(DISMISSED_CHANGE_EVENT, onDismissedChange);

  return () => {
    dismissedListeners.delete(onStoreChange);
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(DISMISSED_CHANGE_EVENT, onDismissedChange);
  };
}

function getDismissedSetupSnapshot(): string {
  return dismissedSnapshot;
}

function getDismissedSetupServerSnapshot(): string {
  return "";
}

export function dismissedSetFromSnapshotKey(key: string): Set<SetupStepId> {
  if (key === "") {
    return new Set();
  }
  return new Set(key.split("|") as SetupStepId[]);
}

export function notifyDismissedSetupChanged() {
  if (syncDismissedSnapshotFromStorage()) {
    notifyDismissedListeners();
  }
}

/** Resets module state — tests only. */
export function resetDismissedSetupStoreForTests() {
  dismissedSnapshot = "";
  dismissedListeners.clear();
}

export { getDismissedSetupServerSnapshot, getDismissedSetupSnapshot, subscribeToDismissedSetup };
