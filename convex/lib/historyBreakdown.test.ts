import { expect, test } from "vite-plus/test";

import { STATUSES } from "./domain";
import { aggregateBreakdownRows } from "./historyBreakdown";

const [confirmed, skipped] = [STATUSES[0], STATUSES[2]] as const;

test("確定だけカテゴリ集計し、見送りは別カウント", () => {
  const itemById = new Map([
    [
      "i1" as never,
      {
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
        _id: "i2" as never,
        categoryId: "c2" as never,
        name: "英会話",
        ownerId: "owner",
        sortOrder: 0,
      },
    ],
  ]);
  const categoryById = new Map([
    ["c1" as never, { _id: "c1" as never, name: "多聴", ownerId: "owner", sortOrder: 1 }],
    ["c2" as never, { _id: "c2" as never, name: "英会話", ownerId: "owner", sortOrder: 4 }],
  ]);

  const result = aggregateBreakdownRows(
    [
      {
        _id: "r1" as never,
        content: "",
        dateJst: "2026-08-17",
        dayId: "d1" as never,
        itemId: "i1" as never,
        minutes: 30,
        ownerId: "owner",
        sortOrder: 0,
        status: confirmed,
      },
      {
        _id: "r2" as never,
        content: "",
        dateJst: "2026-08-17",
        dayId: "d1" as never,
        itemId: "i2" as never,
        minutes: 20,
        ownerId: "owner",
        sortOrder: 1,
        status: skipped,
      },
    ],
    itemById,
    categoryById,
  );

  expect(result.confirmedMinutes).toBe(30);
  expect(result.skippedMinutes).toBe(20);
  expect(result.byCategory).toEqual([{ category: "多聴", categorySortOrder: 1, minutes: 30 }]);
});
