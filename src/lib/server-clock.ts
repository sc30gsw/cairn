import { tryLocalStorageGet, tryLocalStorageSet } from "~/lib/safe-storage";

export const SERVER_CLOCK_OFFSET_KEY = "cairn:timer:clock-offset-ms";

const MAX_OFFSET_MS = 24 * 60 * 60 * 1000;

export function readOffsetMs(): number {
  const raw = tryLocalStorageGet(SERVER_CLOCK_OFFSET_KEY);
  if (raw === null) {
    return 0;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || Math.abs(parsed) > MAX_OFFSET_MS) {
    return 0;
  }
  return parsed;
}

export function serverNowMs(): number {
  return Date.now() + readOffsetMs();
}

export function recordServerInstant(serverMs: number, localBeforeMs: number): void {
  const offset = serverMs - localBeforeMs;
  if (!Number.isFinite(offset) || offset > MAX_OFFSET_MS || offset <= readOffsetMs()) {
    return;
  }
  tryLocalStorageSet(SERVER_CLOCK_OFFSET_KEY, String(offset));
}
