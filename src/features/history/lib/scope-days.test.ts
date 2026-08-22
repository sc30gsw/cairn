import { expect, test } from "vite-plus/test";

import {
  avgMinutesByCondition,
  daysWithMemo,
  groupMemosByCondition,
  sortDaysNewestFirst,
} from "~/features/history/lib/scope-days";
import type { HeatmapDay } from "~/features/history/types/history";

function day(dateJst: string, overrides: Partial<HeatmapDay> = {}): HeatmapDay {
  return {
    condition: null,
    dateJst,
    isRest: false,
    memo: null,
    minutes: 0,
    movingAverage: 0,
    ...overrides,
  };
}

test("sortDaysNewestFirst は新しい日付を先に並べる", () => {
  expect(
    sortDaysNewestFirst([day("2026-08-15"), day("2026-08-17"), day("2026-08-16")]).map(
      (entry) => entry.dateJst,
    ),
  ).toEqual(["2026-08-17", "2026-08-16", "2026-08-15"]);
});

test("avgMinutesByCondition は未設定コンディションを除外する", () => {
  expect(
    avgMinutesByCondition([
      day("2026-08-15", { condition: "好調", minutes: 30 }),
      day("2026-08-16", { condition: "好調", minutes: 10 }),
      day("2026-08-17", { memo: "メモのみ", minutes: 40 }),
    ]),
  ).toEqual([{ avgMinutes: 20, condition: "好調", dayCount: 2 }]);
});

test("groupMemosByCondition はコンディション別にメモをまとめる", () => {
  expect(
    groupMemosByCondition([
      day("2026-08-15", { condition: "普通", memo: "普通日" }),
      day("2026-08-17", { condition: "好調", memo: "好調日" }),
      day("2026-08-16", { memo: "メモだけ" }),
    ]).map((group) => ({
      condition: group.condition,
      dates: group.days.map((entry) => entry.dateJst),
    })),
  ).toEqual([
    { condition: "好調", dates: ["2026-08-17"] },
    { condition: "普通", dates: ["2026-08-15"] },
    { condition: null, dates: ["2026-08-16"] },
  ]);
});

test("daysWithMemo はメモがある日だけを新しい順で返す", () => {
  expect(
    daysWithMemo([
      day("2026-08-15", { memo: "古い" }),
      day("2026-08-16"),
      day("2026-08-17", { memo: "新しい" }),
    ]).map((entry) => entry.dateJst),
  ).toEqual(["2026-08-17", "2026-08-15"]);
});
