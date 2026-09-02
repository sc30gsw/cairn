import { expect, test } from "vite-plus/test";

import {
  isReviewDue,
  nextReviewStage,
  REVIEW_INTERVAL_DAYS,
  REVIEW_STAGE_COUNT,
  reviewDueJst,
  reviewIntervalDays,
} from "./review";

test("間隔は 1 → 3 → 7 → 14 日で、範囲外の段階は端に丸める", () => {
  expect(REVIEW_INTERVAL_DAYS).toEqual([1, 3, 7, 14]);
  expect(reviewIntervalDays(0)).toBe(1);
  expect(reviewIntervalDays(3)).toBe(14);
  expect(reviewIntervalDays(9)).toBe(14);
  expect(reviewIntervalDays(-1)).toBe(1);
});

test("期日は基準日から段階ぶんの日数後。月末をまたいでも暦日で数える", () => {
  expect(reviewDueJst("2026-08-31", 0)).toBe("2026-09-01");
  expect(reviewDueJst("2026-08-30", 1)).toBe("2026-09-02");
  expect(reviewDueJst("2026-08-20", 3)).toBe("2026-09-03");
});

test("次の段階は最後で止まり、期日は当日を含めて到来とみなす", () => {
  expect(nextReviewStage(0)).toBe(1);
  expect(nextReviewStage(REVIEW_STAGE_COUNT - 1)).toBeNull();
  expect(isReviewDue("2026-09-02", "2026-09-02")).toBe(true);
  expect(isReviewDue("2026-09-01", "2026-09-02")).toBe(true);
  expect(isReviewDue("2026-09-03", "2026-09-02")).toBe(false);
});
