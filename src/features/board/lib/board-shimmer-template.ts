import { STATUSES } from "~domain/domain";

import type { BoardRow } from "~/features/board/types/board";
import { shimmerId } from "~/lib/shimmer-id";

const [confirmed, pending] = STATUSES;

export const boardShimmerRows = [
  {
    _id: shimmerId<BoardRow["_id"]>("row-pending"),
    category: "多聴",
    categorySortOrder: 1,
    content: "",
    itemId: shimmerId<BoardRow["itemId"]>("item-1"),
    itemName: "Distinction 2000",
    minutes: 30,
    sortOrder: 0,
    status: pending,
    timer: null,
  },
  {
    _id: shimmerId<BoardRow["_id"]>("row-confirmed"),
    category: "多聴",
    categorySortOrder: 1,
    content: "Unit 1",
    itemId: shimmerId<BoardRow["itemId"]>("item-2"),
    itemName: "金のフレーズ",
    minutes: 20,
    sortOrder: 1,
    status: confirmed,
    timer: null,
  },
] as const satisfies readonly BoardRow[];
