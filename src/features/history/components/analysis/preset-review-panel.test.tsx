import { expect, test } from "vite-plus/test";

import { PresetReviewPanel } from "~/features/history/components/analysis/preset-review-panel";
import type { PresetReview } from "~/features/history/types/history";
import { renderWithMantine } from "~/test-utils/render";

const emptyWeekdays = [1, 2, 3, 4, 5, 6, 0].map((weekday) => ({
  confirmed: 0,
  leftover: 0,
  planned: 0,
  presetId: null,
  presetName: null,
  skipped: 0,
  weekday,
}));

const review = {
  suggestions: [{ reason: "leftoverHeavy" as const, weekday: 1 }],
  weekdays: emptyWeekdays.map((row) =>
    row.weekday === 1
      ? { ...row, leftover: 4, planned: 6, skipped: 1, confirmed: 1, presetName: "月曜日" }
      : row,
  ),
  weeklyTargets: { achieved: 1, total: 3 },
  windowEnd: "2026-08-20",
  windowStart: "2026-07-24",
} satisfies PresetReview;

test("曜日の件数と提案リンクを出す", () => {
  const { getByRole, getByText } = renderWithMantine(<PresetReviewPanel review={review} />);

  expect(getByText("曜日の計画")).toBeDefined();
  expect(getByText(/今週の週間ターゲットは 1\/3 達成/)).toBeDefined();
  expect(getByRole("progressbar", { name: "月曜日の消化 1/6" })).toBeDefined();
  expect(getByText(/未着手のまま残ることが多い/)).toBeDefined();
  expect(getByRole("link", { name: "月曜日のプリセットを見る" })).toBeDefined();
  expect(getByRole("link", { name: "週間ターゲットを見る" })).toBeDefined();
});

test("記録が無い期間は空メッセージだけ出す", () => {
  const { getByText, queryByText } = renderWithMantine(
    <PresetReviewPanel
      review={{
        ...review,
        suggestions: [],
        weekdays: emptyWeekdays,
        weeklyTargets: { achieved: 0, total: 0 },
      }}
    />,
  );

  expect(
    getByText("この期間に日がある記録がありません。休養の曜日はここには出ません。"),
  ).toBeDefined();
  expect(queryByText("今週の週間ターゲット")).toBeNull();
});
