import { expect, test } from "vite-plus/test";
import { WEEKDAY_DISPLAY_ORDER } from "~domain/presetDigest";

import { PresetReviewPanel } from "~/features/history/components/analysis/preset-review-panel";
import type { PresetReview } from "~/features/history/types/history";
import { renderWithMemoryRouter, renderWithMantine } from "~/test-utils/render";

const emptyWeekdays = WEEKDAY_DISPLAY_ORDER.map((weekday) => ({
  confirmed: 0,
  leftover: 0,
  ongoing: 0,
  planned: 0,
  skipped: 0,
  weekday,
}));

const review = {
  suggestions: [{ reason: "leftoverHeavy" as const, weekday: 1 }],
  weekdays: emptyWeekdays.map((row) =>
    row.weekday === 1 ? { ...row, leftover: 4, planned: 6, skipped: 1, confirmed: 1 } : row,
  ),
  windowEnd: "2026-08-20",
  windowStart: "2026-07-24",
} satisfies PresetReview;

test("曜日の件数と提案リンクを出す", async () => {
  const { getByRole, getByText } = await renderWithMemoryRouter(
    <PresetReviewPanel review={review} />,
  );

  expect(getByText("曜日の計画")).toBeDefined();
  expect(getByRole("progressbar", { name: "月曜日の消化 1/6" })).toBeDefined();
  expect(getByText(/未着手のまま残ることが多い/)).toBeDefined();
  expect(getByRole("link", { name: "月曜日のプリセットを見る" }).getAttribute("href")).toBe(
    "/presets?weekday=1#preset-weekday-1",
  );
});

test("記録が無い期間は空メッセージだけ出す", () => {
  const { getByText } = renderWithMantine(
    <PresetReviewPanel
      review={{
        ...review,
        suggestions: [],
        weekdays: emptyWeekdays,
      }}
    />,
  );

  expect(
    getByText("この期間に日がある記録がありません。休養の曜日はここには出ません。"),
  ).toBeDefined();
});
