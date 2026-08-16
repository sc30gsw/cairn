import { STATUSES } from "~domain/domain";

import type { TrashPage } from "~/features/trash/types/trash";

const confirmed = STATUSES[0];

export const trashShimmerPage = {
  days: [{ _id: "shimmer-day" as never, dateJst: "2026-08-17", deletedAt: 1 }],
  rows: [
    {
      _id: "shimmer-row" as never,
      content: "Unit 1",
      dateJst: "2026-08-17",
      deletedAt: 1,
      itemName: "Distinction 2000",
      minutes: 30,
      status: confirmed,
    },
  ],
} satisfies TrashPage;
