import { useSyncExternalStore } from "react";
import { addDaysJst, todayJst, type DateJst } from "~domain/jst";

const MIDNIGHT_MARGIN_MS = 2_000;

let currentValue: DateJst = todayJst();
let timeoutId: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();

function msUntilNextJstMidnight(): number {
  const nextDateJst = addDaysJst(currentValue, 1);
  const nextMidnightMs = new Date(`${nextDateJst}T00:00:00+09:00`).getTime();
  return Math.max(nextMidnightMs - Date.now() + MIDNIGHT_MARGIN_MS, 0);
}

function notify(): void {
  for (const listener of listeners) {
    listener();
  }
}

function scheduleNextCheck(): void {
  if (timeoutId !== null) {
    clearTimeout(timeoutId);
  }
  timeoutId = setTimeout(recompute, msUntilNextJstMidnight());
}

function recompute(): void {
  const next = todayJst();
  if (next !== currentValue) {
    currentValue = next;
    notify();
  }
  scheduleNextCheck();
}

function handleWake(): void {
  recompute();
}

function start(): void {
  recompute();
  document.addEventListener("visibilitychange", handleWake);
  window.addEventListener("focus", handleWake);
}

function stop(): void {
  if (timeoutId !== null) {
    clearTimeout(timeoutId);
    timeoutId = null;
  }
  document.removeEventListener("visibilitychange", handleWake);
  window.removeEventListener("focus", handleWake);
}

function subscribe(listener: () => void): () => void {
  if (listeners.size === 0) {
    start();
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      stop();
    }
  };
}

function getSnapshot(): DateJst {
  return currentValue;
}

function getServerSnapshot(): DateJst {
  return todayJst();
}

export function useTodayJst(): DateJst {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
