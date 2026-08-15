import { expect, test } from "vite-plus/test";

import { SEED_ITEMS, seedLineNamesForWeekday } from "./catalog";

test("初期項目は模試なしで CONTEXT の8つ", () => {
  expect(SEED_ITEMS.map((item) => item.name)).toEqual([
    "Distinction 2000",
    "英会話",
    "金のフレーズ",
    "多読",
    "英文法（解く）",
    "英文法（復習）",
    "出る文特急",
    "その他",
  ]);
});

test("金フレ・英文法・出る文特急は TOEIC対策", () => {
  const toeic = SEED_ITEMS.filter((item) => item.category === "TOEIC対策").map((item) => item.name);
  expect(toeic).toEqual(["金のフレーズ", "英文法（解く）", "英文法（復習）", "出る文特急"]);
});

test("Distinction 2000 は多聴、多読は多読、英会話は英会話、その他はその他", () => {
  expect(SEED_ITEMS.find((item) => item.name === "Distinction 2000")?.category).toBe("多聴");
  expect(SEED_ITEMS.find((item) => item.name === "多読")?.category).toBe("多読");
  expect(SEED_ITEMS.find((item) => item.name === "英会話")?.category).toBe("英会話");
  expect(SEED_ITEMS.find((item) => item.name === "その他")?.category).toBe("その他");
});

test("平日プリセットは Distinction・英会話・金フレ・多読・英文法・出る文特急", () => {
  expect(seedLineNamesForWeekday(1)).toEqual([
    "Distinction 2000",
    "英会話",
    "金のフレーズ",
    "多読",
    "英文法（解く）",
    "英文法（復習）",
    "出る文特急",
  ]);
});

test("水曜は英文法なし", () => {
  expect(seedLineNamesForWeekday(3)).toEqual([
    "Distinction 2000",
    "英会話",
    "金のフレーズ",
    "多読",
    "出る文特急",
  ]);
});

test("土日は学習行を自動生成しない", () => {
  expect(seedLineNamesForWeekday(0)).toEqual([]);
  expect(seedLineNamesForWeekday(6)).toEqual([]);
});
