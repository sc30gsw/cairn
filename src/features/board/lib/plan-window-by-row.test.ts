import { expect, test } from "vite-plus/test";

import { boardCardMark, planWindowLabelByRowId } from "~/features/board/lib/plan-window-by-row";

test("記録に紐づく予定は時刻で出し、重複は何件目と件数を別に持つ", () => {
  const labels = planWindowLabelByRowId([
    { endTime: "10:00", materializedRowId: "a", startTime: "09:00" },
    { endTime: "12:00", materializedRowId: "a", startTime: "11:00" },
    { endTime: "13:00", startTime: "12:30" },
  ]);

  expect(labels.get("a")).toBe("09:00〜10:00");
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
    place: { countLabel: "2件", ordinalLabel: "1件目" },
    timeLabel: "09:00〜10:00",
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
    place: { countLabel: "2件", ordinalLabel: "2件目" },
    timeLabel: null,
  });
  expect(
    boardCardMark({ _id: "solo", itemId: "other" }, [{ _id: "solo", itemId: "other" }], labels),
  ).toEqual({ place: null, timeLabel: null });
});
