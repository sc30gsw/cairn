import { expect, test } from "vite-plus/test";

import { STATUSES } from "./domain";
import { formatShareMarkdown, formatWeeklyShareMarkdown, type ShareRow } from "./share";

const [confirmed, pending, _ongoing, skipped] = STATUSES;

test("カテゴリが1つでも見出しは省略しない。未着手とスキップは出ない", () => {
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

  expect(formatShareMarkdown(rows)).toBe(["- TOEIC対策", "  - 金のフレーズ: 1-50 20分"].join("\n"));
});

test("項目名がカテゴリ名と一致しひとこと空、かつ1件だけなら1行に畳む(カテゴリが1つでも)", () => {
  const rows = [
    {
      category: "英会話",
      categorySortOrder: 3,
      content: "",
      itemName: "英会話",
      minutes: 30,
      sortOrder: 0,
      status: confirmed,
    },
  ] as const satisfies readonly ShareRow[];

  expect(formatShareMarkdown(rows)).toBe("- 英会話 30分");
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
      "- 英会話 30分",
    ].join("\n"),
  );
});

const WEEK = { activeDays: 5, weekEnd: "2026-08-23", weekStart: "2026-08-17" } as const;

test("週版は見出し行つきの2階層で、カテゴリ間に空行を入れない", () => {
  expect(
    formatWeeklyShareMarkdown({
      ...WEEK,
      rows: [
        { category: "TOEIC対策", itemName: "金のフレーズ", minutes: 180 },
        { category: "TOEIC対策", itemName: "出る文特急", minutes: 120 },
        { category: "多聴", itemName: "Distinction 2000", minutes: 200 },
        { category: "英会話", itemName: "英会話", minutes: 120 },
      ],
      volumeMinutes: 620,
    }),
  ).toBe(
    [
      "週次まとめ 2026-08-17〜2026-08-23（学習量 620分 / 実施 5日）",
      "- TOEIC対策",
      "  - 金のフレーズ 180分",
      "  - 出る文特急 120分",
      "- 多聴",
      "  - Distinction 2000 200分",
      "- 英会話 120分",
    ].join("\n"),
  );
});

test("週版は rows の並びをカテゴリ順として保つ", () => {
  expect(
    formatWeeklyShareMarkdown({
      ...WEEK,
      rows: [
        { category: "多聴", itemName: "Distinction 2000", minutes: 30 },
        { category: "TOEIC対策", itemName: "金のフレーズ", minutes: 20 },
      ],
      volumeMinutes: 50,
    }).split("\n"),
  ).toEqual([
    "週次まとめ 2026-08-17〜2026-08-23（学習量 50分 / 実施 5日）",
    "- 多聴",
    "  - Distinction 2000 30分",
    "- TOEIC対策",
    "  - 金のフレーズ 20分",
  ]);
});

test("週版は確定行が0件なら空文字列", () => {
  expect(formatWeeklyShareMarkdown({ ...WEEK, rows: [], volumeMinutes: 0 })).toBe("");
});

test("週版もひとことを載せず、1件+項目名=カテゴリ名なら1行に畳む", () => {
  expect(
    formatWeeklyShareMarkdown({
      ...WEEK,
      activeDays: 1,
      rows: [{ category: "英会話", itemName: "英会話", minutes: 45 }],
      volumeMinutes: 45,
    }),
  ).toBe(
    ["週次まとめ 2026-08-17〜2026-08-23（学習量 45分 / 実施 1日）", "- 英会話 45分"].join("\n"),
  );
});
