import { expect, test } from "vite-plus/test";

import { formatShareMarkdown } from "./share";

test("カテゴリが1つなら平坦、未着手とスキップは出ない", () => {
  expect(
    formatShareMarkdown([
      {
        category: "TOEIC対策",
        content: "1-50",
        itemName: "金のフレーズ",
        minutes: 20,
        sortOrder: 0,
        status: "確定",
      },
      {
        category: "TOEIC対策",
        content: "Unit 2",
        itemName: "出る文特急",
        minutes: 20,
        sortOrder: 1,
        status: "未着手",
      },
      {
        category: "TOEIC対策",
        content: "",
        itemName: "英文法（解く）",
        minutes: 20,
        sortOrder: 2,
        status: "スキップ",
      },
    ]),
  ).toBe("- 金のフレーズ: 1-50 20分");
});

test("カテゴリが2つ以上なら親+子で固定順、カテゴリ内は入力順", () => {
  expect(
    formatShareMarkdown([
      {
        category: "多聴",
        content: "Unit 1",
        itemName: "Distinction 2000",
        minutes: 30,
        sortOrder: 0,
        status: "確定",
      },
      {
        category: "TOEIC対策",
        content: "1-50",
        itemName: "金のフレーズ",
        minutes: 20,
        sortOrder: 1,
        status: "確定",
      },
      {
        category: "英会話",
        content: "",
        itemName: "英会話",
        minutes: 30,
        sortOrder: 2,
        status: "確定",
      },
    ]),
  ).toBe(
    [
      "- TOEIC対策",
      "  - 金のフレーズ: 1-50 20分",
      "- 多聴",
      "  - Distinction 2000: Unit 1 30分",
      "- 英会話",
      "  - 英会話 30分",
    ].join("\n"),
  );
});
