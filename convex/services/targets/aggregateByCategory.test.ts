import { expect, test } from "vite-plus/test";

import type { Id } from "../../_generated/dataModel";
import { aggregateByCategory, currentForMetric, type TargetRow } from "./aggregateByCategory";

const TOEIC = "category-toeic" as Id<"categories">;
const READING = "category-reading" as Id<"categories">;
const KINFURE = "item-kinfure" as Id<"items">;
const TOKKYU = "item-tokkyu" as Id<"items">;
const TADOKU = "item-tadoku" as Id<"items">;
const ORPHAN = "item-orphan" as Id<"items">;

const CATEGORY_BY_ITEM = new Map<Id<"items">, Id<"categories">>([
  [KINFURE, TOEIC],
  [TOKKYU, TOEIC],
  [TADOKU, READING],
]);

function row(overrides: Partial<TargetRow> = {}): TargetRow {
  return {
    dateJst: "2026-08-17",
    itemId: KINFURE,
    minutes: 20,
    status: "確定",
    ...overrides,
  };
}

test("確定行だけをカテゴリ別に集計する", () => {
  const aggregates = aggregateByCategory(
    [
      row({ minutes: 20 }),
      row({ itemId: TOKKYU, minutes: 10 }),
      row({ itemId: TADOKU, minutes: 45 }),
    ],
    CATEGORY_BY_ITEM,
  );
  expect(aggregates.get(TOEIC)).toEqual({ count: 2, days: 1, minutes: 30 });
  expect(aggregates.get(READING)).toEqual({ count: 1, days: 1, minutes: 45 });
});

test("未着手とスキップは集計に入らない", () => {
  const aggregates = aggregateByCategory(
    [
      row({ minutes: 20 }),
      row({ minutes: 999, status: "未着手" }),
      row({ minutes: 999, status: "スキップ" }),
    ],
    CATEGORY_BY_ITEM,
  );
  expect(aggregates.get(TOEIC)).toEqual({ count: 1, days: 1, minutes: 20 });
});

test("days は確定記録のある暦日数。同じ日に何件あっても1日", () => {
  const aggregates = aggregateByCategory(
    [
      row({ dateJst: "2026-08-17" }),
      row({ dateJst: "2026-08-17", itemId: TOKKYU }),
      row({ dateJst: "2026-08-19" }),
    ],
    CATEGORY_BY_ITEM,
  );
  expect(aggregates.get(TOEIC)?.days).toBe(2);
  expect(aggregates.get(TOEIC)?.count).toBe(3);
});

test("0分でも確定していれば実施日と件数には数える", () => {
  const aggregates = aggregateByCategory([row({ minutes: 0 })], CATEGORY_BY_ITEM);
  expect(aggregates.get(TOEIC)).toEqual({ count: 1, days: 1, minutes: 0 });
});

test("カテゴリの分からない項目の行は無視する", () => {
  const aggregates = aggregateByCategory([row({ itemId: ORPHAN })], CATEGORY_BY_ITEM);
  expect(aggregates.size).toBe(0);
});

test("行が無ければ空の集計", () => {
  expect(aggregateByCategory([], CATEGORY_BY_ITEM).size).toBe(0);
});

test("計器ごとに読み取る値が変わる", () => {
  const aggregate = { count: 3, days: 2, minutes: 75 };
  expect(currentForMetric(aggregate, "minutes")).toBe(75);
  expect(currentForMetric(aggregate, "days")).toBe(2);
  expect(currentForMetric(aggregate, "count")).toBe(3);
});

test("記録の無いカテゴリはどの計器でも0", () => {
  expect(currentForMetric(undefined, "minutes")).toBe(0);
  expect(currentForMetric(undefined, "days")).toBe(0);
  expect(currentForMetric(undefined, "count")).toBe(0);
});
