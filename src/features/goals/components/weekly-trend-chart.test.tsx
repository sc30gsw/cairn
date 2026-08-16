// @vitest-environment happy-dom
import { expect, test } from "vite-plus/test";

import { WeeklyTrendChart } from "~/features/goals/components/weekly-trend-chart";
import { renderWithMantine } from "~/test-utils/render";

test("記録もゴールもない週しかない場合は何も描画しない", () => {
  const { container } = renderWithMantine(
    <WeeklyTrendChart
      weeks={[
        {
          achieved: false,
          goalMinutes: null,
          volumeMinutes: 0,
          weekEnd: "2026-08-16",
          weekStart: "2026-08-10",
        },
      ]}
    />,
  );
  expect(container.firstChild).toBeNull();
});

test("記録がある週があればチャートを描画する", () => {
  const { container } = renderWithMantine(
    <WeeklyTrendChart
      weeks={[
        {
          achieved: true,
          goalMinutes: 300,
          volumeMinutes: 320,
          weekEnd: "2026-08-16",
          weekStart: "2026-08-10",
        },
      ]}
    />,
  );
  expect(container.firstChild).not.toBeNull();
});
