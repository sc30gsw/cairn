import { expect, test } from "vite-plus/test";

import {
  WeeklyTrendChart,
  WeeklyTrendChartTooltip,
  weeklyTrendTooltipContent,
} from "~/features/goals/components/weekly-trend-chart";
import type { WeeklyTrendChartPoint } from "~/features/goals/lib/weekly-trend-chart-data";
import { renderWithMantine } from "~/test-utils/render";

const POINT = {
  label: "08/10〜08/16",
  qualifying: "実施日 4/3 日",
  volumeMinutes: 320,
  他: null,
  達成: 320,
} satisfies WeeklyTrendChartPoint;

test("ツールチップは週ラベル・実施日・総分数を出す", () => {
  const { getByText } = renderWithMantine(<WeeklyTrendChartTooltip point={POINT} />);
  expect(getByText(POINT.label)).toBeDefined();
  expect(getByText(POINT.qualifying)).toBeDefined();
  expect(getByText("320分")).toBeDefined();
});

test("該当する点がない週のツールチップは何も描画しない", () => {
  const { queryByText } = renderWithMantine(<WeeklyTrendChartTooltip point={undefined} />);
  expect(queryByText(POINT.label)).toBeNull();
});

test("weeklyTrendTooltipContent は x 軸ラベルから点を引く", () => {
  const Content = weeklyTrendTooltipContent(new Map([[POINT.label, POINT]]));
  const { getByText } = renderWithMantine(<Content label={POINT.label} />);
  expect(getByText(POINT.qualifying)).toBeDefined();
});

test("weeklyTrendTooltipContent は未知のラベルなら何も描画しない", () => {
  const Content = weeklyTrendTooltipContent(new Map([[POINT.label, POINT]]));
  const { queryByText } = renderWithMantine(<Content label="09/01〜09/07" />);
  expect(queryByText(POINT.qualifying)).toBeNull();
});

test("記録もゴールもない週しかない場合は何も描画しない", () => {
  const { container } = renderWithMantine(
    <WeeklyTrendChart
      weeks={[
        {
          achieved: false,
          dailyFloorMinutes: null,
          goalDays: null,
          qualifyingDays: 0,
          volumeMinutes: 0,
          weekEnd: "2026-08-16",
          weekStart: "2026-08-10",
        },
      ]}
    />,
  );
  expect(container.querySelector("svg")).toBeNull();
});

test("記録がある週があればチャートを描画する", () => {
  const { container } = renderWithMantine(
    <WeeklyTrendChart
      weeks={[
        {
          achieved: true,
          dailyFloorMinutes: 20,
          goalDays: 3,
          qualifyingDays: 4,
          volumeMinutes: 320,
          weekEnd: "2026-08-16",
          weekStart: "2026-08-10",
        },
      ]}
    />,
  );
  //? happy-dom はレイアウトしないため recharts の内側 svg は 0x0 判定で描画されない。Mantine 側のチャートルートまでは描画されることを確認する
  expect(container.querySelector(".mantine-BarChart-root")).not.toBeNull();
});
