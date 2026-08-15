import { expect, test } from "vite-plus/test";

import {
  buildDonutCells,
  buildMonthPaceChartData,
  buildWeekPaceChartData,
  paceChartDayLabel,
  paceChartMonthTitle,
  paceChartWeekTitle,
} from "~/features/history/lib/chart-data";

test("見送りスライスを Donut に足す", () => {
  expect(buildDonutCells([{ category: "多聴", minutes: 30 }], 20)).toEqual([
    { color: "yellow.6", name: "多聴", value: 30 },
    { color: "yellow.4", name: "見送り", value: 20 },
  ]);
});

test("paceChartDayLabel は mm/dd", () => {
  expect(paceChartDayLabel("2026-08-17")).toBe("08/17");
});

test("paceChartWeekTitle は月内週番号", () => {
  expect(paceChartWeekTitle("2026-08-17", "2026-08-23")).toBe("8月第3週");
});

test("paceChartWeekTitle は月跨ぎで日付範囲", () => {
  expect(paceChartWeekTitle("2026-08-31", "2026-09-06")).toBe("08/31〜09/06");
});

test("paceChartMonthTitle", () => {
  expect(paceChartMonthTitle("2026-08")).toBe("8月");
});

test("月の日別ペースは完了と7日平均を持つ", () => {
  expect(
    buildMonthPaceChartData([
      { dateJst: "2026-08-17", isRest: false, minutes: 30, movingAverage: 10 },
    ]),
  ).toEqual([{ dateJst: "2026-08-17", label: "08/17", 完了: 30, 均: 10 }]);
});

test("週の日別ペースは heatmap から均を引く", () => {
  expect(
    buildWeekPaceChartData(
      [{ confirmedMinutes: 10, dateJst: "2026-08-17", isRest: false, skippedMinutes: 0 }],
      [{ dateJst: "2026-08-17", isRest: false, minutes: 10, movingAverage: 12 }],
    ),
  ).toEqual([{ dateJst: "2026-08-17", label: "08/17", 完了: 10, 均: 12 }]);
});
