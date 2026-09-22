import { expect, test } from "vite-plus/test";

import {
  boardRowDistinction,
  planWindowLabelByRowId,
} from "~/features/board/lib/plan-window-by-row";

test("記録に紐づく予定は時刻で区別し、無い重複だけ件数で区別する", () => {
  const labels = planWindowLabelByRowId([
    { endTime: "10:00", materializedRowId: "a", startTime: "09:00" },
    { endTime: "12:00", materializedRowId: "a", startTime: "11:00" },
    { endTime: "13:00", startTime: "12:30" },
  ]);

  expect(labels.get("a")).toBe("予定 09:00–10:00");
  expect(
    boardRowDistinction(
      { _id: "a", itemId: "item" },
      [
        { _id: "a", itemId: "item" },
        { _id: "b", itemId: "item" },
      ],
      labels,
    ),
  ).toBe("予定 09:00–10:00");
  expect(
    boardRowDistinction(
      { _id: "b", itemId: "item" },
      [
        { _id: "a", itemId: "item" },
        { _id: "b", itemId: "item" },
      ],
      labels,
    ),
  ).toBe("2件目");
  expect(
    boardRowDistinction(
      { _id: "solo", itemId: "other" },
      [{ _id: "solo", itemId: "other" }],
      labels,
    ),
  ).toBeNull();
});
