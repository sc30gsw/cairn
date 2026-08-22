import { expect, test } from "vite-plus/test";

import { STATUSES } from "./domain";
import { aggregateBreakdownRows, aggregateByCondition } from "./historyBreakdown";

const [confirmed, pending, _ongoing, skipped] = STATUSES;

const itemById = new Map([
  [
    "i1" as never,
    {
      _creationTime: 0,
      _id: "i1" as never,
      categoryId: "c1" as never,
      name: "Distinction 2000",
      ownerId: "owner",
      sortOrder: 0,
    },
  ],
  [
    "i2" as never,
    {
      _creationTime: 0,
      _id: "i2" as never,
      categoryId: "c2" as never,
      name: "英会話",
      ownerId: "owner",
      sortOrder: 0,
    },
  ],
  [
    "i3" as never,
    {
      _creationTime: 0,
      _id: "i3" as never,
      categoryId: "c1" as never,
      name: "金のフレーズ",
      ownerId: "owner",
      sortOrder: 1,
    },
  ],
]);

const categoryById = new Map([
  [
    "c1" as never,
    { _creationTime: 0, _id: "c1" as never, name: "多聴", ownerId: "owner", sortOrder: 1 },
  ],
  [
    "c2" as never,
    { _creationTime: 0, _id: "c2" as never, name: "英会話", ownerId: "owner", sortOrder: 4 },
  ],
]);

function row(
  id: string,
  itemId: string,
  minutes: number,
  status: (typeof STATUSES)[number],
  sortOrder = 0,
) {
  return {
    _creationTime: 0,
    _id: id as never,
    content: "",
    dateJst: "2026-08-17",
    dayId: "d1" as never,
    itemId: itemId as never,
    minutes,
    ownerId: "owner",
    sortOrder,
    status,
  };
}

test("確定だけカテゴリ集計し、見送りは別カウント", () => {
  const result = aggregateBreakdownRows(
    [row("r1", "i1", 30, confirmed), row("r2", "i2", 20, skipped, 1)],
    itemById,
    categoryById,
  );

  expect(result.confirmedMinutes).toBe(30);
  expect(result.skippedMinutes).toBe(20);
  expect(result.byCategory).toEqual([{ category: "多聴", categorySortOrder: 1, minutes: 30 }]);
});

test("内訳 rows は確定のみで、未着手と見送りを除外する", () => {
  const result = aggregateBreakdownRows(
    [
      row("r1", "i1", 30, confirmed),
      row("r2", "i2", 20, skipped, 1),
      row("r3", "i3", 10, pending, 2),
    ],
    itemById,
    categoryById,
  );

  expect(result.rows).toEqual([
    { category: "多聴", itemName: "Distinction 2000", minutes: 30, status: confirmed },
  ]);
});

test("同一項目の確定行は分数を合算して1行にする", () => {
  const result = aggregateBreakdownRows(
    [row("r1", "i1", 30, confirmed), row("r2", "i1", 15, confirmed, 1)],
    itemById,
    categoryById,
  );

  expect(result.confirmedMinutes).toBe(45);
  expect(result.rows).toEqual([
    { category: "多聴", itemName: "Distinction 2000", minutes: 45, status: confirmed },
  ]);
});

test("内訳 rows はカテゴリ順・項目名順に並ぶ", () => {
  const result = aggregateBreakdownRows(
    [
      row("r1", "i2", 20, confirmed),
      row("r2", "i3", 10, confirmed, 1),
      row("r3", "i1", 30, confirmed, 2),
    ],
    itemById,
    categoryById,
  );

  expect(result.rows.map((entry) => entry.itemName)).toEqual([
    "Distinction 2000",
    "金のフレーズ",
    "英会話",
  ]);
});

test("確定分数を日のコンディションで分け、未設定を残す", () => {
  const rows = [
    { ...row("r1", "i1", 30, confirmed), dateJst: "2026-08-17" },
    { ...row("r2", "i2", 20, confirmed), dateJst: "2026-08-18" },
    { ...row("r3", "i3", 10, skipped), dateJst: "2026-08-17" },
  ];

  expect(
    aggregateByCondition(rows, {
      "2026-08-17": "好調",
      "2026-08-18": null,
    }),
  ).toEqual([
    { condition: "好調", minutes: 30 },
    { condition: "未設定", minutes: 20 },
  ]);
});
