import { expect, test } from "vite-plus/test";

import { isShortSleep, sleepHours } from "./sleep";

test("就寝 21:00・起床 5:30 なら睡眠 8.5 時間", () => {
  expect(sleepHours("21:00", "05:30")).toBe(8.5);
});

test("7時間未満なら警告", () => {
  expect(isShortSleep(sleepHours("23:00", "05:30"))).toBe(true);
  expect(isShortSleep(7)).toBe(false);
  expect(isShortSleep(8.5)).toBe(false);
});
