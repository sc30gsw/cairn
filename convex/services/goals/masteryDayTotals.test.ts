import { expect, test } from "vite-plus/test";

import type { Id } from "../../_generated/dataModel";
import {
  activeDayDelta,
  confirmedTotalsByItem,
  EMPTY_DAY_TOTALS,
  initialMasteryProgress,
  masteryProgressDelta,
  sameItemTotals,
  scopedDayTotals,
  shiftMasteryProgress,
  type ItemConfirmedTotals,
} from "./masteryDayTotals";

const KINFURE = "item-kinfure" as Id<"items">;
const TADOKU = "item-tadoku" as Id<"items">;

function totalsOf(entries: readonly [Id<"items">, number, number][]): ItemConfirmedTotals {
  return new Map(
    entries.map(([itemId, confirmedCount, confirmedMinutes]) => [
      itemId,
      { confirmedCount, confirmedMinutes },
    ]),
  );
}

test("確定だけを項目別に数え、ゴミ箱の記録と確定以外は外す", () => {
  expect(
    confirmedTotalsByItem(
      [
        { deletedAt: undefined, itemId: KINFURE, minutes: 30, status: "確定" },
        { deletedAt: undefined, itemId: KINFURE, minutes: 20, status: "確定" },
        { deletedAt: undefined, itemId: TADOKU, minutes: 40, status: "確定" },
        { deletedAt: undefined, itemId: KINFURE, minutes: 999, status: "未着手" },
        { deletedAt: undefined, itemId: TADOKU, minutes: 999, status: "スキップ" },
        { deletedAt: 1, itemId: KINFURE, minutes: 999, status: "確定" },
      ],
      true,
    ),
  ).toEqual(
    totalsOf([
      [KINFURE, 2, 50],
      [TADOKU, 1, 40],
    ]),
  );
});

test("日がゴミ箱にあるとその暦日は丸ごと空になる", () => {
  expect(
    confirmedTotalsByItem(
      [{ deletedAt: undefined, itemId: KINFURE, minutes: 30, status: "確定" }],
      false,
    ).size,
  ).toBe(0);
});

test("0分の確定でも件数は数える(実施日は分数ではなく件数で決まる)", () => {
  expect(
    confirmedTotalsByItem(
      [{ deletedAt: undefined, itemId: KINFURE, minutes: 0, status: "確定" }],
      true,
    ),
  ).toEqual(totalsOf([[KINFURE, 1, 0]]));
});

test("項目別合計が完全一致なら同一、どこか1つでも違えば別", () => {
  const before = totalsOf([
    [KINFURE, 1, 30],
    [TADOKU, 1, 40],
  ]);
  expect(
    sameItemTotals(
      before,
      totalsOf([
        [KINFURE, 1, 30],
        [TADOKU, 1, 40],
      ]),
    ),
  ).toBe(true);
  //? 分数だけ違う
  expect(
    sameItemTotals(
      before,
      totalsOf([
        [KINFURE, 1, 45],
        [TADOKU, 1, 40],
      ]),
    ),
  ).toBe(false);
  //? 件数だけ違う
  expect(
    sameItemTotals(
      before,
      totalsOf([
        [KINFURE, 2, 30],
        [TADOKU, 1, 40],
      ]),
    ),
  ).toBe(false);
  //? キーが減った
  expect(sameItemTotals(before, totalsOf([[KINFURE, 1, 30]]))).toBe(false);
  //? キーが増えた
  expect(sameItemTotals(totalsOf([[KINFURE, 1, 30]]), before)).toBe(false);
});

test("日合計が同じでも項目が入れ替われば別と判定する(早期リターンの安全性)", () => {
  expect(sameItemTotals(totalsOf([[KINFURE, 1, 30]]), totalsOf([[TADOKU, 1, 30]]))).toBe(false);
});

test("対象項目で絞った日合計。未指定は全項目の合計、該当なしはゼロ", () => {
  const totals = totalsOf([
    [KINFURE, 2, 50],
    [TADOKU, 1, 40],
  ]);
  expect(scopedDayTotals(totals, undefined)).toEqual({ confirmedCount: 3, confirmedMinutes: 90 });
  expect(scopedDayTotals(totals, [KINFURE])).toEqual({ confirmedCount: 2, confirmedMinutes: 50 });
  expect(scopedDayTotals(totals, [KINFURE, TADOKU])).toEqual({
    confirmedCount: 3,
    confirmedMinutes: 90,
  });
  expect(scopedDayTotals(totals, ["item-none" as Id<"items">])).toEqual(EMPTY_DAY_TOTALS);
  expect(scopedDayTotals(new Map(), undefined)).toEqual(EMPTY_DAY_TOTALS);
});

test("実施日数は 0↔正 の遷移でだけ ±1 する", () => {
  expect(activeDayDelta(0, 1)).toBe(1);
  expect(activeDayDelta(1, 0)).toBe(-1);
  expect(activeDayDelta(1, 2)).toBe(0);
  expect(activeDayDelta(2, 1)).toBe(0);
  expect(activeDayDelta(0, 0)).toBe(0);
});

test("差分は前後の実測の引き算で、前後が同じなら0", () => {
  expect(
    masteryProgressDelta(
      { confirmedCount: 0, confirmedMinutes: 0 },
      { confirmedCount: 1, confirmedMinutes: 30 },
    ),
  ).toEqual({ activeDays: 1, confirmedMinutes: 30 });
  expect(
    masteryProgressDelta(
      { confirmedCount: 2, confirmedMinutes: 50 },
      { confirmedCount: 1, confirmedMinutes: 30 },
    ),
  ).toEqual({ activeDays: 0, confirmedMinutes: -20 });
  expect(
    masteryProgressDelta(
      { confirmedCount: 1, confirmedMinutes: 30 },
      { confirmedCount: 0, confirmedMinutes: 0 },
    ),
  ).toEqual({ activeDays: -1, confirmedMinutes: -30 });
  //? 前後が同じ = その書き込みは実績を動かしていない(重複した日ドキュメントでの漂流防止)
  expect(
    masteryProgressDelta(
      { confirmedCount: 1, confirmedMinutes: 30 },
      { confirmedCount: 1, confirmedMinutes: 30 },
    ),
  ).toEqual({ activeDays: 0, confirmedMinutes: 0 });
});

test("保存カウンタに差分を足す", () => {
  expect(
    shiftMasteryProgress(
      { activeDays: 3, confirmedMinutes: 180 },
      { activeDays: -1, confirmedMinutes: -30 },
    ),
  ).toEqual({ activeDays: 2, confirmedMinutes: 150 });
});

test("作成日の実績は実施日1日ぶんに丸める", () => {
  expect(initialMasteryProgress({ confirmedCount: 2, confirmedMinutes: 50 })).toEqual({
    activeDays: 1,
    confirmedMinutes: 50,
  });
  expect(initialMasteryProgress(EMPTY_DAY_TOTALS)).toEqual({
    activeDays: 0,
    confirmedMinutes: 0,
  });
});
