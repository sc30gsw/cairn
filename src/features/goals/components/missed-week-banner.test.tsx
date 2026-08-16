import { expect, test, vi } from "vite-plus/test";

import { MissedWeekBanner } from "~/features/goals/components/missed-week-banner";
import { renderWithMantine } from "~/test-utils/render";

const LAST_WEEK = {
  achieved: false,
  goalMinutes: 300,
  volumeMinutes: 100,
  weekEnd: "2026-08-16",
  weekStart: "2026-08-10",
};

test("障害プランが未登録なら作成を促す文言になる", () => {
  const { getByRole } = renderWithMantine(
    <MissedWeekBanner hasObstacles={false} lastWeek={LAST_WEEK} onShowObstacles={vi.fn()} />,
  );
  expect(getByRole("button", { name: "障害プランを作成する" })).toBeDefined();
});

test("障害プランが登録済みなら見る文言になる", () => {
  const { getByRole } = renderWithMantine(
    <MissedWeekBanner hasObstacles lastWeek={LAST_WEEK} onShowObstacles={vi.fn()} />,
  );
  expect(getByRole("button", { name: "障害プランを見る" })).toBeDefined();
});
