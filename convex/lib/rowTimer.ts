import type { RowTimerDto } from "./validators";

export const TIMER_MAX_SEGMENT_MS = 4 * 60 * 60 * 1000;

export const TIMER_AUTO_STOP_MINUTES = TIMER_MAX_SEGMENT_MS / 60_000;

export type TimerRunState = "一時停止" | "計測なし" | "計測中";

export function timerRunState(timer: RowTimerDto | null): TimerRunState {
  if (timer === null) {
    return "計測なし";
  }
  if (timer.startedAt !== null) {
    return "計測中";
  }
  return timer.accumulatedMs > 0 ? "一時停止" : "計測なし";
}

export function segmentElapsedMs(startedAt: number, nowMs: number): number {
  const raw = nowMs - startedAt;
  if (raw <= 0) {
    return 0;
  }
  return Math.min(raw, TIMER_MAX_SEGMENT_MS);
}

export function isSegmentExpired(startedAt: number, nowMs: number): boolean {
  return nowMs - startedAt >= TIMER_MAX_SEGMENT_MS;
}

export function measuredMs(timer: RowTimerDto | null, nowMs: number): number {
  if (timer === null) {
    return 0;
  }
  if (timer.startedAt === null) {
    return timer.accumulatedMs;
  }
  return timer.accumulatedMs + segmentElapsedMs(timer.startedAt, nowMs);
}

export function timerMinutes(ms: number): number {
  if (ms <= 0) {
    return 0;
  }
  return Math.max(1, Math.round(ms / 60_000));
}

export function hasTimerState(timer: RowTimerDto | null): boolean {
  return timer !== null && (timer.startedAt !== null || timer.accumulatedMs > 0);
}
