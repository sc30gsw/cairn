import { expect, test } from "vite-plus/test";
import { TIMER_MAX_SEGMENT_MS } from "~domain/rowTimer";

import { formatTimerClock } from "~/lib/timer-clock";

test("formatTimerClock は1時間未満を mm:ss、それ以上を h:mm:ss で出す", () => {
  expect(formatTimerClock(0)).toBe("00:00");
  expect(formatTimerClock(-5_000)).toBe("00:00");
  expect(formatTimerClock(754_000)).toBe("12:34");
  expect(formatTimerClock(3_600_000)).toBe("1:00:00");
  expect(formatTimerClock(TIMER_MAX_SEGMENT_MS)).toBe("4:00:00");
});
