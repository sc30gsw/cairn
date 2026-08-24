import { expect, test } from "vite-plus/test";

import {
  hasTimerState,
  isSegmentExpired,
  measuredMs,
  segmentElapsedMs,
  TIMER_AUTO_STOP_MINUTES,
  TIMER_MAX_SEGMENT_MS,
  timerMinutes,
  timerRunState,
} from "./rowTimer";
import type { RowTimerDto } from "./validators";

function timer(overrides: Partial<RowTimerDto> = {}): RowTimerDto {
  return { accumulatedMs: 0, autoStoppedAt: null, startedAt: null, ...overrides };
}

test("timerRunState は保存フィールドから副状態を導出する", () => {
  expect(timerRunState(null)).toBe("計測なし");
  expect(timerRunState(timer({ startedAt: 1_000 }))).toBe("計測中");
  expect(timerRunState(timer({ accumulatedMs: 60_000 }))).toBe("一時停止");
  expect(timerRunState(timer({ accumulatedMs: 0 }))).toBe("計測なし");
});

test("segmentElapsedMs は負を0に、上限超過を上限に丸める", () => {
  expect(segmentElapsedMs(1_000, 61_000)).toBe(60_000);
  expect(segmentElapsedMs(61_000, 1_000)).toBe(0);
  expect(segmentElapsedMs(0, 0)).toBe(0);
  expect(segmentElapsedMs(0, TIMER_MAX_SEGMENT_MS)).toBe(TIMER_MAX_SEGMENT_MS);
  expect(segmentElapsedMs(0, TIMER_MAX_SEGMENT_MS + 60_000)).toBe(TIMER_MAX_SEGMENT_MS);
});

test("measuredMs は一時停止では accumulated、計測中では accumulated + 区間", () => {
  expect(measuredMs(null, 10_000)).toBe(0);
  expect(measuredMs(timer({ accumulatedMs: 120_000 }), 10_000)).toBe(120_000);
  expect(measuredMs(timer({ accumulatedMs: 120_000, startedAt: 1_000 }), 61_000)).toBe(180_000);
});

test("timerMinutes は1ms でも1分に切り上げ、丸め境界で Math.round に従う", () => {
  expect(timerMinutes(0)).toBe(0);
  expect(timerMinutes(-1)).toBe(0);
  expect(timerMinutes(1)).toBe(1);
  expect(timerMinutes(29_999)).toBe(1);
  expect(timerMinutes(30_000)).toBe(1);
  expect(timerMinutes(89_999)).toBe(1);
  expect(timerMinutes(90_000)).toBe(2);
  expect(timerMinutes(TIMER_MAX_SEGMENT_MS)).toBe(TIMER_AUTO_STOP_MINUTES);
  expect(TIMER_AUTO_STOP_MINUTES).toBe(240);
});

test("isSegmentExpired は上限ちょうどで真になる", () => {
  expect(isSegmentExpired(0, TIMER_MAX_SEGMENT_MS - 1)).toBe(false);
  expect(isSegmentExpired(0, TIMER_MAX_SEGMENT_MS)).toBe(true);
  expect(isSegmentExpired(0, TIMER_MAX_SEGMENT_MS + 1)).toBe(true);
});

test("hasTimerState は計測が一度も走っていない行で偽", () => {
  expect(hasTimerState(null)).toBe(false);
  expect(hasTimerState(timer())).toBe(false);
  expect(hasTimerState(timer({ startedAt: 1_000 }))).toBe(true);
  expect(hasTimerState(timer({ accumulatedMs: 1 }))).toBe(true);
});
