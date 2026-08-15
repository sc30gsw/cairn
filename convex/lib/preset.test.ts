import { expect, test } from "vite-plus/test";

import {
  itemIdIsInUse,
  keptRowsAfterSwitch,
  materializePresetRows,
  weekdayAlreadyTaken,
} from "./preset";

test("プリセット適用はすべて未着手", () => {
  expect(
    materializePresetRows([
      { content: "Unit 1", itemId: "item-a", minutes: 30 },
      { content: "", itemId: "item-b", minutes: 30 },
    ]),
  ).toEqual([
    { content: "Unit 1", itemId: "item-a", minutes: 30, status: "未着手" },
    { content: "", itemId: "item-b", minutes: 30, status: "未着手" },
  ]);
});

test("切替は未着手だけ差し替え、確定とスキップは残る", () => {
  expect(
    keptRowsAfterSwitch([
      { status: "確定" },
      { status: "スキップ" },
      { status: "未着手" },
    ]),
  ).toEqual([{ status: "確定" }, { status: "スキップ" }]);
});

test("同じ曜日のプリセットが二つある状態は拒否する", () => {
  expect(weekdayAlreadyTaken(1, [1, 2])).toBe(true);
  expect(weekdayAlreadyTaken(3, [1, 2])).toBe(false);
  expect(weekdayAlreadyTaken(1, [1, 2], 1)).toBe(false);
});

test("使っている行または雛形がある項目は削除不可", () => {
  expect(itemIdIsInUse("item-a", [{ itemId: "item-a" }])).toBe(true);
  expect(itemIdIsInUse("item-b", [{ itemId: "item-a" }])).toBe(false);
});
