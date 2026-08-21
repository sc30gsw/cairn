import { expect, test } from "vite-plus/test";

import {
  presetReviewCaption,
  suggestionCopy,
  suggestionLinkLabel,
  weekdayLabel,
} from "~/features/history/lib/preset-review-copy";

test("提案文は断定せず件数を出す", () => {
  expect(
    suggestionCopy(
      { reason: "leftoverHeavy", weekday: 1 },
      {
        confirmed: 1,
        leftover: 4,
        planned: 6,
        skipped: 1,
        weekday: 1,
      },
    ),
  ).toBe("直近の月曜日は、並んだ6件のうち確定1・見送り1・未着手4。未着手のまま残ることが多い。");
  expect(suggestionLinkLabel(1)).toBe("月曜日のプリセットを見る");
  expect(weekdayLabel(0)).toBe("日曜日");
});

test("見送りが多い提案は見送りと書く", () => {
  expect(
    suggestionCopy(
      { reason: "skipHeavy", weekday: 3 },
      {
        confirmed: 1,
        leftover: 1,
        planned: 6,
        skipped: 4,
        weekday: 3,
      },
    ),
  ).toContain("見送りが多い。");
});

test("窓の文言は今日と休養を除く", () => {
  expect(presetReviewCaption("2026-07-24", "2026-08-20")).toContain("今日と休養は含めない");
});
