import { expect, test } from "vite-plus/test";

import {
  buildDonutCells,
  buildMonthPaceChartData,
  buildPaceSelectedDateReferenceDots,
  buildPaceWeekendReferenceAreas,
  buildWeekdayCategoryMatrix,
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
    buildMonthPaceChartData([{ dateJst: "2026-08-17", minutes: 30, movingAverage: 10 }]),
  ).toEqual([{ dateJst: "2026-08-17", label: "08/17", 完了: 30, 均: 10 }]);
});

test("週の日別ペースは heatmap から均を引く", () => {
  expect(
    buildWeekPaceChartData(
      [{ confirmedMinutes: 10, dateJst: "2026-08-17" }],
      [{ dateJst: "2026-08-17", movingAverage: 12 }],
    ),
  ).toEqual([{ dateJst: "2026-08-17", label: "08/17", 完了: 10, 均: 12 }]);
});

test("週末の帯と選択日の点を日別ペースへ追加する", () => {
  const data = buildMonthPaceChartData([
    { dateJst: "2026-08-15", minutes: 20, movingAverage: 10 },
    { dateJst: "2026-08-16", minutes: 0, movingAverage: 10 },
  ]);
  expect(buildPaceWeekendReferenceAreas(data)).toEqual([
    { color: "orange.2", x1: "08/15", x2: "08/16" },
  ]);
  expect(buildPaceSelectedDateReferenceDots(data, "2026-08-15")).toEqual([
    { color: "orange.7", label: "選択日", x: "08/15", y: 20 },
  ]);
});

test("曜日×カテゴリは昨日までの対象日を分母にして平均する", () => {
  expect(
    buildWeekdayCategoryMatrix(
      [
        { category: "多聴", dateJst: "2026-08-17", minutes: 30, status: "確定" },
        { category: "多聴", dateJst: "2026-08-18", minutes: 20, status: "確定" },
        { category: "英会話", dateJst: "2026-08-19", minutes: 10, status: "未着手" },
      ],
      [
        { dateJst: "2026-08-17", kind: "live" },
        { dateJst: "2026-08-18", kind: "rest" },
        { dateJst: "2026-08-19", kind: "beforeRegistration" },
        { dateJst: "2026-08-20", kind: "todayEmpty" },
        { dateJst: "2026-08-21", kind: "unrecorded" },
      ],
      "2026-08-20",
      ["多聴"],
    ),
  ).toEqual([
    { days: 1, value: 30, x: "月", y: "多聴" },
    { days: 1, value: 20, x: "火", y: "多聴" },
    { days: 0, value: null, x: "水", y: "多聴" },
    { days: 0, value: null, x: "木", y: "多聴" },
    { days: 0, value: null, x: "金", y: "多聴" },
    { days: 0, value: null, x: "土", y: "多聴" },
    { days: 0, value: null, x: "日", y: "多聴" },
  ]);
});
