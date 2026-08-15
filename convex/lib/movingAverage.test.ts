import { expect, test } from "vite-plus/test";

import { sevenDayMovingAverage } from "./movingAverage";

test("欠け日は 0 として 7 日移動平均に入る", () => {
  const minutesByDate = { "2026-08-15": 70 };
  expect(sevenDayMovingAverage(minutesByDate, "2026-08-15")).toBe(10);
});

test("記録した日だけの平均にはしない", () => {
  const minutesByDate = {
    "2026-08-09": 10,
    "2026-08-10": 20,
    "2026-08-11": 30,
    "2026-08-12": 40,
    "2026-08-13": 50,
    "2026-08-14": 60,
    "2026-08-15": 70,
  };
  expect(sevenDayMovingAverage(minutesByDate, "2026-08-15")).toBe(40);
});
