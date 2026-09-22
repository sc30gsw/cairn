import { expect, test } from "vite-plus/test";

import { boardCardMark, planWindowLabelByRowId } from "~/features/board/lib/plan-window-by-row";

test("記録に紐づく予定は時刻をすべて出し、重複は何件目だけを持つ", () => {
  const labels = planWindowLabelByRowId([
    { endTime: "10:00", materializedRowId: "a", startTime: "09:00" },
    { endTime: "12:00", materializedRowId: "a", startTime: "11:00" },
    { endTime: "10:00", materializedRowId: "a", startTime: "09:00" },
    { endTime: "15:00", materializedRowId: "b", startTime: "14:00" },
    { endTime: "13:00", startTime: "12:30" },
  ]);

  expect(labels.get("a")).toEqual(["09:00〜10:00", "11:00〜12:00"]);
  expect(labels.get("b")).toEqual(["14:00〜15:00"]);
  expect(
    boardCardMark(
      { _id: "a", itemId: "item" },
      [
        { _id: "a", itemId: "item" },
        { _id: "b", itemId: "item" },
      ],
      labels,
    ),
  ).toEqual({
    ordinalLabel: "1件目",
    timeLabels: ["09:00〜10:00", "11:00〜12:00"],
  });
  expect(
    boardCardMark(
      { _id: "b", itemId: "item" },
      [
        { _id: "a", itemId: "item" },
        { _id: "b", itemId: "item" },
      ],
      labels,
    ),
  ).toEqual({
    ordinalLabel: "2件目",
    timeLabels: ["14:00〜15:00"],
  });
  expect(
    boardCardMark({ _id: "solo", itemId: "other" }, [{ _id: "solo", itemId: "other" }], labels),
  ).toEqual({ ordinalLabel: null, timeLabels: [] });
});
