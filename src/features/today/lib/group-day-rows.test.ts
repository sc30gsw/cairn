import { expect, test } from "vite-plus/test";
import { STATUSES } from "~domain/domain";

import {
  DAY_GROUP_CONFIRMED_STATUS,
  DAY_GROUP_INCOMPLETE_STATUS,
  DAY_GROUP_SKIPPED_STATUS,
  dayGroupCounts,
  dayGroupStatus,
  duplicateRecordBadgeLabel,
  groupDayRowsByItem,
  groupDisplayMinutes,
  joinedRowContent,
  splitGroupMinutes,
} from "~/features/today/lib/group-day-rows";
import type { DayRow } from "~/features/today/types/day";

const [confirmed, pending, inProgress, skipped] = STATUSES;

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
  expect(dayGroupCounts(groups[0]?.rows ?? [])).toEqual({
    completeCount: 1,
    incompleteCount: 1,
    totalCount: 2,
  });
  expect(duplicateRecordBadgeLabel({ completeCount: 1, incompleteCount: 1, totalCount: 2 })).toBe(
    `2件 · ${DAY_GROUP_INCOMPLETE_STATUS}1 · ${DAY_GROUP_CONFIRMED_STATUS}1`,
  );
});

test("グループの状態はスキップ優先、次に未着手か進行中、全部確定なら完了", () => {
  expect(dayGroupStatus([{ status: skipped }, { status: confirmed }])).toBe(
    DAY_GROUP_SKIPPED_STATUS,
  );
  expect(dayGroupStatus([{ status: pending }, { status: confirmed }])).toBe(
    DAY_GROUP_INCOMPLETE_STATUS,
  );
  expect(dayGroupStatus([{ status: inProgress }, { status: confirmed }])).toBe(
    DAY_GROUP_INCOMPLETE_STATUS,
  );
  expect(dayGroupStatus([{ status: confirmed }, { status: confirmed }])).toBe(
    DAY_GROUP_CONFIRMED_STATUS,
  );
});

test("スキップは件数に入り、未完了件数には入らない", () => {
  expect(dayGroupCounts([{ status: skipped }, { status: confirmed }, { status: pending }])).toEqual(
    {
      completeCount: 1,
      incompleteCount: 1,
      totalCount: 3,
    },
  );
});

test("ひとことは出現順の異なる文を読点でつなぎ、空と重複は捨てる", () => {
  expect(joinedRowContent([{ content: "Unit 1" }, { content: "Unit 1" }])).toBe("Unit 1");
  expect(joinedRowContent([{ content: "" }, { content: "" }])).toBe("");
  expect(joinedRowContent([{ content: "Unit 1" }, { content: "Unit 2" }])).toBe("Unit 1、Unit 2");
  expect(joinedRowContent([{ content: "" }, { content: "Unit 1" }])).toBe("Unit 1");
});

test("グループの分数は件数で割り余りを捨てる", () => {
  expect(splitGroupMinutes(60, 2)).toBe(30);
  expect(splitGroupMinutes(61, 2)).toBe(30);
  expect(splitGroupMinutes(120, 3)).toBe(40);
  expect(splitGroupMinutes(5, 0)).toBe(0);
});

test("計測中の行は保存分数の代わりに経過分を合計へ足す", () => {
  expect(
    groupDisplayMinutes(
      [
        { minutes: 30, timer: null },
        {
          minutes: 30,
          timer: { accumulatedMs: 12 * 60_000, autoStoppedAt: null, startedAt: null },
        },
      ],
      0,
    ),
  ).toBe(42);
});
