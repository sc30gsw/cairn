import { expect, test } from "vite-plus/test";

import { STATUSES } from "./domain";
import { formatShareMarkdown, type ShareRow } from "./share";

const [confirmed, pending, skipped] = STATUSES;

test("カテゴリが1つなら平坦、未着手とスキップは出ない", () => {
  const rows = [
    {
      category: "TOEIC対策",
      categorySortOrder: 0,
      content: "1-50",
      itemName: "金のフレーズ",
      minutes: 20,
      sortOrder: 0,
      status: confirmed,
    },
    {
      category: "TOEIC対策",
      categorySortOrder: 0,
      content: "Unit 2",
      itemName: "出る文特急",
      minutes: 20,
      sortOrder: 1,
      status: pending,
    },
    {
      category: "TOEIC対策",
      categorySortOrder: 0,
      content: "",
      itemName: "英文法（解く）",
      minutes: 20,
      sortOrder: 2,
      status: skipped,
    },
  ] as const satisfies readonly ShareRow[];

  expect(formatShareMarkdown(rows)).toBe("- 金のフレーズ: 1-50 20分");
});

test("カテゴリが2つ以上なら親+子で sortOrder 順、カテゴリ内は入力順", () => {
  const rows = [
    {
      category: "多聴",
      categorySortOrder: 1,
      content: "Unit 1",
      itemName: "Distinction 2000",
      minutes: 30,
      sortOrder: 0,
      status: confirmed,
    },
    {
      category: "TOEIC対策",
      categorySortOrder: 0,
      content: "1-50",
      itemName: "金のフレーズ",
      minutes: 20,
      sortOrder: 1,
      status: confirmed,
    },
    {
      category: "英会話",
      categorySortOrder: 3,
      content: "",
      itemName: "英会話",
      minutes: 30,
      sortOrder: 2,
      status: confirmed,
    },
  ] as const satisfies readonly ShareRow[];

  expect(formatShareMarkdown(rows)).toBe(
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
