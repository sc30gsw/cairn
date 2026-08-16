import { expect, test } from "vite-plus/test";

import {
  buildHeatmapDays,
  buildMinutesByDate,
  calendarDatesFromTo,
  liveDayDatesFrom,
  liveRows,
} from "../services/history/shared";

test("liveDayDatesFrom は削除済み日を除外する", () => {
  const dates = liveDayDatesFrom([
    { dateJst: "2026-08-17", deletedAt: undefined, ownerId: "o" } as never,
    { dateJst: "2026-08-18", deletedAt: 1, ownerId: "o" } as never,
  ]);
  expect([...dates]).toEqual(["2026-08-17"]);
});

test("liveRows は削除行と非 live 日の行を除外する", () => {
  const liveDates = new Set(["2026-08-17"]);
  const rows = liveRows(
    [
      { dateJst: "2026-08-17", deletedAt: undefined } as never,
      { dateJst: "2026-08-17", deletedAt: 1 } as never,
      { dateJst: "2026-08-18", deletedAt: undefined } as never,
    ],
    liveDates,
  );
  expect(rows).toHaveLength(1);
  expect(rows[0]?.dateJst).toBe("2026-08-17");
});

test("calendarDatesFromTo は両端を含む", () => {
  expect(calendarDatesFromTo("2026-08-15", "2026-08-17")).toEqual([
    "2026-08-15",
    "2026-08-16",
    "2026-08-17",
  ]);
});

test("buildMinutesByDate と buildHeatmapDays が確定分を集計する", () => {
  const liveDates = new Set(["2026-08-17"]);
  const rows = [
    { dateJst: "2026-08-17", deletedAt: undefined, minutes: 30, status: "確定" } as never,
    { dateJst: "2026-08-17", deletedAt: undefined, minutes: 10, status: "スキップ" } as never,
  ];
  const minutesByDate = buildMinutesByDate(rows, liveDates);
  expect(minutesByDate["2026-08-17"]).toBe(30);
  const heatmap = buildHeatmapDays(["2026-08-17"], liveDates, minutesByDate);
  expect(heatmap[0]).toMatchObject({ dateJst: "2026-08-17", minutes: 30, isRest: false });
});
