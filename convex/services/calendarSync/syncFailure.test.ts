import { expect, test } from "vite-plus/test";

import { CALENDAR_SYNC_RETRY_DELAYS_MS } from "../../lib/calendarSync";
import { retryDelayMs } from "./syncFailure";

test("再試行の待ち時間は段階ごとに伸び、段階を使い切ると undefined で諦めを示す", () => {
  expect(CALENDAR_SYNC_RETRY_DELAYS_MS.map((_, attempt) => retryDelayMs(attempt))).toEqual([
    ...CALENDAR_SYNC_RETRY_DELAYS_MS,
  ]);
  expect(retryDelayMs(CALENDAR_SYNC_RETRY_DELAYS_MS.length)).toBeUndefined();
});
