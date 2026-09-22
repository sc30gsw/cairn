import { expect, test } from "vite-plus/test";
import { STATUSES } from "~domain/domain";

import {
  dayGroupCounts,
  duplicatePlanBadgeLabel,
  groupDayRowsByItem,
} from "~/features/today/lib/group-day-rows";
import type { DayRow } from "~/features/today/types/day";

const [confirmed, pending] = STATUSES;

const baseRow = {
  category: "多聴",
  categorySortOrder: 1,
  content: "",
  itemId: "item1" as DayRow["itemId"],
  itemName: "Distinction 2000",
  minutes: 30,
  review: null,
  sortOrder: 0,
  status: pending,
  timer: null,
} satisfies Omit<DayRow, "_id">;

function row(id: string, overrides: Partial<DayRow> = {}): DayRow {
  return { ...baseRow, _id: id as DayRow["_id"], ...overrides };
}

test("同じ項目の記録は出現順を保って1グループにまとめ、分数と状態を足す", () => {
  const groups = groupDayRowsByItem([
    row("a", { minutes: 10, status: pending }),
    row("b", { itemId: "item2" as DayRow["itemId"], itemName: "金フレ", minutes: 5 }),
    row("c", { minutes: 20, status: confirmed }),
  ]);

  expect(groups.map((group) => group.itemName)).toEqual(["Distinction 2000", "金フレ"]);
  expect(groups[0]?.rows.map((entry) => entry._id)).toEqual(["a", "c"]);
  expect(groups[0]?.totalMinutes).toBe(30);
  expect(groups[0]?.statuses).toEqual([pending, confirmed]);
  expect(groups[1]?.totalMinutes).toBe(5);
  expect(dayGroupCounts(groups[0]?.rows ?? [])).toEqual({ completeCount: 1, incompleteCount: 1 });
  expect(duplicatePlanBadgeLabel({ completeCount: 1, incompleteCount: 1 })).toBe(
    "未完了予定が1件、完了1件",
  );
});
