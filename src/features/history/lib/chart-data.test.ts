import { expect, test } from "vite-plus/test";

import { buildDonutCells, buildWeekBarData } from "~/features/history/lib/chart-data";

test("見送りスライスを Donut に足す", () => {
  expect(
    buildDonutCells([{ category: "多聴", minutes: 30 }], 20),
  ).toEqual([
    { color: "yellow.6", name: "多聴", value: 30 },
    { color: "yellow.4", name: "見送り", value: 20 },
  ]);
});

test("週 Bar のラベルは日付", () => {
  expect(
    buildWeekBarData([{ confirmedMinutes: 10, dateJst: "2026-08-17" }]),
  ).toEqual([{ dateJst: "2026-08-17", label: "17", 確定: 10 }]);
});
