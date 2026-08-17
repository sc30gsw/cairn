import { expect, test, vi } from "vite-plus/test";

import { MissedWeekBanner } from "~/features/goals/components/missed-week-banner";
import type { WeeklyTrendWeek } from "~/features/goals/types/goal";
import { renderWithMantine } from "~/test-utils/render";

const LAST_WEEK = {
  achieved: false,
  dailyFloorMinutes: 20,
  goalDays: 3,
  qualifyingDays: 1,
  volumeMinutes: 100,
  weekEnd: "2026-08-16",
  weekStart: "2026-08-10",
} satisfies WeeklyTrendWeek;

test("障害プランが未登録なら作成を促す文言になる", () => {
  const { getByRole } = renderWithMantine(
    <MissedWeekBanner hasObstacles={false} lastWeek={LAST_WEEK} onShowObstacles={vi.fn()} />,
  );
  expect(getByRole("button", { name: "障害プランを作成する" })).toBeDefined();
});

test("障害プランが登録済みなら見る文言になる", () => {
  const { getByRole, getByText } = renderWithMantine(
    <MissedWeekBanner hasObstacles lastWeek={LAST_WEEK} onShowObstacles={vi.fn()} />,
  );
  expect(getByRole("button", { name: "障害プランを見る" })).toBeDefined();
  expect(getByText(/実施日 1\/3日/)).toBeDefined();
});
