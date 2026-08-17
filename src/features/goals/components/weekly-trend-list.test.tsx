import { expect, test } from "vite-plus/test";

import { WeeklyTrendList } from "~/features/goals/components/weekly-trend-list";
import type { WeeklyTrendWeek } from "~/features/goals/types/goal";
import { renderWithMantine } from "~/test-utils/render";

function makeWeek(overrides: Partial<WeeklyTrendWeek>): WeeklyTrendWeek {
  return {
    achieved: false,
    dailyFloorMinutes: null,
    goalDays: null,
    qualifyingDays: 0,
    volumeMinutes: 0,
    weekEnd: "2026-08-16",
    weekStart: "2026-08-10",
    ...overrides,
  };
}

test("記録もゴールもない週しかなければ空状態を出す", () => {
  const { getByText } = renderWithMantine(<WeeklyTrendList weeks={[makeWeek({})]} />);
  expect(getByText("過去の週の実績はまだありません")).toBeDefined();
});

test("達成・未達・ゴールなしのバッジが週ごとに出る", () => {
  const weeks = [
    makeWeek({
      achieved: true,
      dailyFloorMinutes: 20,
      goalDays: 3,
      qualifyingDays: 4,
      volumeMinutes: 320,
      weekEnd: "2026-08-16",
      weekStart: "2026-08-10",
    }),
    makeWeek({
      dailyFloorMinutes: 20,
      goalDays: 3,
      qualifyingDays: 1,
      volumeMinutes: 100,
      weekEnd: "2026-08-09",
      weekStart: "2026-08-03",
    }),
    makeWeek({ volumeMinutes: 50, weekEnd: "2026-08-02", weekStart: "2026-07-27" }),
  ];
  const { getByText } = renderWithMantine(<WeeklyTrendList weeks={weeks} />);

  expect(getByText("達成")).toBeDefined();
  expect(getByText("未達")).toBeDefined();
  expect(getByText("ゴールなし")).toBeDefined();
  expect(getByText("実施日 4/3日")).toBeDefined();
  expect(getByText("実施日 1/3日")).toBeDefined();
  expect(getByText("実施日 0日")).toBeDefined();
});
