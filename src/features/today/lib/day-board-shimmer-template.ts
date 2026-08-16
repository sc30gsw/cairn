import { STATUSES } from "~domain/domain";

import type { ItemDto, PresetDto } from "~/features/catalog/types/item";
import type { DayPage, DayRow } from "~/features/today/types/day";

const pendingStatus = STATUSES[1];

const shimmerItemId = "shimmer-item" as ItemDto["_id"];
const shimmerCategoryId = "shimmer-category" as ItemDto["categoryId"];

export const dayBoardShimmerRow = {
  _id: "shimmer-row-1" as DayRow["_id"],
  category: "多聴",
  categorySortOrder: 1,
  content: "",
  itemId: shimmerItemId,
  itemName: "Distinction 2000",
  minutes: 30,
  sortOrder: 0,
  status: pendingStatus,
} satisfies DayRow;

export const dayBoardShimmerRow2 = {
  ...dayBoardShimmerRow,
  _id: "shimmer-row-2" as DayRow["_id"],
  content: "Unit 1",
  sortOrder: 1,
} satisfies DayRow;

export function dayBoardShimmerDay(dateJst: string): DayPage {
  return {
    dateJst,
    day: {
      _id: "shimmer-day" as NonNullable<DayPage["day"]>["_id"],
      condition: null,
      dateJst,
      memo: null,
    },
    isFuture: false,
    rows: [dayBoardShimmerRow, dayBoardShimmerRow2],
    shareMarkdown: "",
    volumeMinutes: 30,
  };
}

export const dayBoardShimmerItems = [
  {
    _id: shimmerItemId,
    categoryId: shimmerCategoryId,
    name: dayBoardShimmerRow.itemName,
    sortOrder: 0,
  },
] satisfies ItemDto[];

export const dayBoardShimmerPresets = [
  {
    _id: "shimmer-preset" as PresetDto["_id"],
    lines: [
      {
        content: dayBoardShimmerRow.content,
        itemId: shimmerItemId,
        itemName: dayBoardShimmerRow.itemName,
        minutes: dayBoardShimmerRow.minutes,
      },
      {
        content: dayBoardShimmerRow2.content,
        itemId: shimmerItemId,
        itemName: dayBoardShimmerRow.itemName,
        minutes: dayBoardShimmerRow2.minutes,
      },
    ],
    name: "月曜日",
    weekday: 1,
  },
] satisfies PresetDto[];
