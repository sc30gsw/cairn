import { STATUSES } from "~domain/domain";

import type { DayPage, DayRow } from "~/features/today/types/day";

const [, pending] = [STATUSES[0], STATUSES[1]] as const;

export const CONCRETE_ACTION = "Unit 1 を音読する";
export const CONCRETE_ACTION_2 = "Unit 2 を音読する";

export const dayBoardTestRow = {
  _id: "row1" as DayRow["_id"],
  category: "多聴",
  categorySortOrder: 1,
  content: "",
  itemId: "item1" as DayRow["itemId"],
  itemName: "Distinction 2000",
  minutes: 30,
  sortOrder: 0,
  status: pending,
  timer: null,
} satisfies DayRow;

export const dayBoardTestDay = {
  canCopyYesterday: false,
  dateJst: "2026-08-17",
  day: {
    _id: "day1" as NonNullable<DayPage["day"]>["_id"],
    condition: null,
    dateJst: "2026-08-17",
    memo: null,
  },
  kind: "live",
  rows: [dayBoardTestRow],
  shareMarkdown: "",
  volumeMinutes: 0,
} satisfies DayPage;

export const dayBoardTestItems = [
  {
    _id: dayBoardTestRow.itemId,
    categoryId: "c1" as never,
    name: "Distinction 2000",
    sortOrder: 0,
  },
];
