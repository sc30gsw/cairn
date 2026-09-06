import { expect, test } from "vite-plus/test";

import {
  formatDayNavigationLabel,
  formatWeekNavigationLabel,
} from "~/features/board/lib/board-schedule-navigation-labels";

test("formatDayNavigationLabel は日本語の日付ラベルを返す", () => {
  expect(formatDayNavigationLabel("2026-08-17")).toBe("2026/08/17");
});

test("formatWeekNavigationLabel は同月の週範囲を返す", () => {
  expect(formatWeekNavigationLabel("2026-08-10")).toBe("2026/08/10 〜 2026/08/16");
});

test("formatWeekNavigationLabel は月をまたぐ週範囲を返す", () => {
  expect(formatWeekNavigationLabel("2026-07-27")).toBe("2026/07/27 〜 2026/08/02");
});
