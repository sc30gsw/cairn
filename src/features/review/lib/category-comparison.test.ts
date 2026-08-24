import { expect, test } from "vite-plus/test";

import {
  buildCategoryComparisonRows,
  categoryComparisonChartRows,
} from "~/features/review/lib/category-comparison";

const CURRENT = [
  { category: "TOEIC対策", categorySortOrder: 0, minutes: 620 },
  { category: "多聴", categorySortOrder: 1, minutes: 120 },
];

test("今月と先月をカテゴリ名で突き合わせ、増減を分とパーセントで書く", () => {
  const rows = buildCategoryComparisonRows(CURRENT, [
    { category: "TOEIC対策", minutes: 540 },
    { category: "多聴", minutes: 200 },
  ]);

  expect(rows).toEqual([
    {
      category: "TOEIC対策",
      categorySortOrder: 0,
      currentMinutes: 620,
      deltaLabel: "+80分（+15%）",
      deltaMinutes: 80,
      previousMinutes: 540,
    },
    {
      category: "多聴",
      categorySortOrder: 1,
      currentMinutes: 120,
      deltaLabel: "-80分（-40%）",
      deltaMinutes: -80,
      previousMinutes: 200,
    },
  ]);
});

test("先月に無いカテゴリは「新規」、同値は「変化なし」", () => {
  const rows = buildCategoryComparisonRows(CURRENT, [{ category: "多聴", minutes: 120 }]);

  expect(rows.map((row) => row.deltaLabel)).toEqual(["新規", "変化なし"]);
});

test("先月にしか無いカテゴリは末尾で「先月のみ」になる", () => {
  const rows = buildCategoryComparisonRows(CURRENT, [
    { category: "TOEIC対策", minutes: 540 },
    { category: "英会話", minutes: 90 },
  ]);

  expect(rows.map((row) => row.category)).toEqual(["TOEIC対策", "多聴", "英会話"]);
  expect(rows.at(-1)).toMatchObject({
    currentMinutes: 0,
    deltaLabel: "先月のみ",
    deltaMinutes: -90,
    previousMinutes: 90,
  });
});

test("先月が丸ごと空なら全行が「新規」になり、パーセントを出さない", () => {
  const rows = buildCategoryComparisonRows(CURRENT, []);

  expect(rows.map((row) => row.deltaLabel)).toEqual(["新規", "新規"]);
});

test("並び順はカテゴリの sortOrder、同順なら名前", () => {
  const rows = buildCategoryComparisonRows(
    [
      { category: "多聴", categorySortOrder: 1, minutes: 60 },
      { category: "TOEIC対策", categorySortOrder: 0, minutes: 60 },
      { category: "英会話", categorySortOrder: 1, minutes: 60 },
    ],
    [],
  );

  expect(rows.map((row) => row.category)).toEqual(["TOEIC対策", "英会話", "多聴"]);
});

test("グラフ用の行は今月・先月ともに0分の行を落とす", () => {
  const rows = buildCategoryComparisonRows(
    [{ category: "休止中", categorySortOrder: 0, minutes: 0 }, ...CURRENT],
    [{ category: "TOEIC対策", minutes: 540 }],
  );

  expect(rows).toHaveLength(3);
  expect(categoryComparisonChartRows(rows).map((row) => row.category)).toEqual([
    "TOEIC対策",
    "多聴",
  ]);
});
