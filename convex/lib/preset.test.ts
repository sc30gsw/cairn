import { expect, test } from "vite-plus/test";

import {
  itemIsInUse,
  materializePresetRows,
  switchPresetRows,
  weekdayAlreadyTaken,
} from "./preset";

test("プリセット適用はすべて未着手", () => {
  expect(
    materializePresetRows([
      { content: "Unit 1", itemName: "Distinction 2000", minutes: 30 },
      { content: "", itemName: "英会話", minutes: 30 },
    ]),
  ).toEqual([
    { content: "Unit 1", itemName: "Distinction 2000", minutes: 30, status: "未着手" },
    { content: "", itemName: "英会話", minutes: 30, status: "未着手" },
  ]);
});

test("切替は未着手だけ差し替え、確定とスキップは残る", () => {
  expect(
    switchPresetRows(
      [
        { content: "Unit 1", itemName: "Distinction 2000", minutes: 30, status: "確定" },
        { content: "", itemName: "英会話", minutes: 30, status: "スキップ" },
        { content: "1-50", itemName: "金のフレーズ", minutes: 20, status: "未着手" },
      ],
      [{ content: "多読", itemName: "多読", minutes: 20 }],
    ),
  ).toEqual([
    { content: "Unit 1", itemName: "Distinction 2000", minutes: 30, status: "確定" },
    { content: "", itemName: "英会話", minutes: 30, status: "スキップ" },
    { content: "多読", itemName: "多読", minutes: 20, status: "未着手" },
  ]);
});

test("同じ曜日のプリセットが二つある状態は拒否する", () => {
  expect(weekdayAlreadyTaken(1, [1, 2])).toBe(true);
  expect(weekdayAlreadyTaken(3, [1, 2])).toBe(false);
  expect(weekdayAlreadyTaken(1, [1, 2], 1)).toBe(false);
});

test("使っている行がある項目は削除不可", () => {
  expect(itemIsInUse("金のフレーズ", [{ itemName: "金のフレーズ" }])).toBe(true);
  expect(itemIsInUse("多読", [{ itemName: "金のフレーズ" }])).toBe(false);
});
