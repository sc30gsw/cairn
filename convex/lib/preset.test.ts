import { expect, test } from "vite-plus/test";

import type { Id } from "../_generated/dataModel";
import { STATUSES } from "./domain";
import {
  itemIdIsInUse,
  keptRowsAfterSwitch,
  materializePresetRows,
  weekdayAlreadyTaken,
  type ExistingRow,
} from "./preset";

const [confirmed, pending, ongoing, skipped] = STATUSES;
const itemA = "item-a" as Id<"items">;
const itemB = "item-b" as Id<"items">;

test("プリセット適用はすべて未着手", () => {
  expect(
    materializePresetRows([
      { content: "Unit 1", itemId: itemA, minutes: 30 },
      { content: "", itemId: itemB, minutes: 30 },
    ]),
  ).toEqual([
    { content: "Unit 1", itemId: itemA, minutes: 30, status: pending },
    { content: "", itemId: itemB, minutes: 30, status: pending },
  ]);
});

test("切替は未着手だけ差し替え、確定・進行中・スキップは残る", () => {
  const rows = [
    { status: confirmed },
    { status: skipped },
    { status: ongoing },
    { status: pending },
  ] as const satisfies readonly ExistingRow[];

  expect(keptRowsAfterSwitch(rows)).toEqual([
    { status: confirmed },
    { status: skipped },
    { status: ongoing },
  ]);
});

test("同じ曜日のプリセットが二つある状態は拒否する", () => {
  expect(weekdayAlreadyTaken(1, [1, 2])).toBe(true);
  expect(weekdayAlreadyTaken(3, [1, 2])).toBe(false);
  expect(weekdayAlreadyTaken(1, [1, 2], 1)).toBe(false);
});

test("使っている行または雛形がある項目は削除不可", () => {
  expect(itemIdIsInUse(itemA, [{ itemId: itemA }])).toBe(true);
  expect(itemIdIsInUse(itemB, [{ itemId: itemA }])).toBe(false);
});
