import { STATUSES } from "~domain/domain";
import type { DateJst } from "~domain/jst";

import type { DayPage, DayRow } from "~/features/today/types/day";
import { shimmerId } from "~/lib/shimmer-id";
import type { ItemDto, PresetDto } from "~/types/item";

const pendingStatus = STATUSES[1];

const shimmerItemId = shimmerId<ItemDto["_id"]>("item");
const shimmerCategoryId = shimmerId<ItemDto["categoryId"]>("category");

const dayBoardShimmerRow = {
  _id: shimmerId<DayRow["_id"]>("row-1"),
  category: "多聴",
  categorySortOrder: 1,
  content: "",
  itemId: shimmerItemId,
  itemName: "Distinction 2000",
  minutes: 30,
  sortOrder: 0,
  status: pendingStatus,
  timer: null,
} satisfies DayRow;

const dayBoardShimmerRow2 = {
  ...dayBoardShimmerRow,
  _id: shimmerId<DayRow["_id"]>("row-2"),
  content: "Unit 1",
  sortOrder: 1,
} satisfies DayRow;

export function dayBoardShimmerDay(dateJst: DateJst): DayPage {
  return {
    canCopyYesterday: false,
    dateJst,
    day: {
      _id: shimmerId<NonNullable<DayPage["day"]>["_id"]>("day"),
      condition: null,
      dateJst,
      memo: null,
    },
    kind: "live",
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
    _id: shimmerId<PresetDto["_id"]>("preset"),
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
