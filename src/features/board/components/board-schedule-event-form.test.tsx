import { expect, test, vi } from "vite-plus/test";

import { BoardScheduleEventForm } from "~/features/board/components/board-schedule-event-form";
import type { BoardRow } from "~/features/board/types/board";
import { renderWithMantine } from "~/test-utils/render";

const onSubmit = vi.fn(async () => undefined);

function sampleRow(id: string, name: string): BoardRow {
  return {
    _id: id as BoardRow["_id"],
    category: "多聴",
    categorySortOrder: 1,
    content: "",
    itemId: "i1" as BoardRow["itemId"],
    itemName: name,
    minutes: 0,
    sortOrder: 0,
    status: "未着手",
  };
}

test("BoardScheduleEventForm renders row options and submit button", () => {
  const start = new Date("2026-08-17T00:00:00.000Z");
  const end = new Date("2026-08-17T01:00:00.000Z");
  const { getByRole, getByText } = renderWithMantine(
    <BoardScheduleEventForm
      initialValues={{
        blockId: undefined,
        color: "blue",
        end,
        rowId: sampleRow("r1", "Distinction")._id,
        start,
      }}
      onClose={() => undefined}
      onSubmit={onSubmit}
      opened
      rows={[sampleRow("r1", "Distinction"), sampleRow("r2", "金フレ")]}
    />,
  );

  expect(getByText("予定を追加")).toBeDefined();
  expect(getByRole("button", { name: "保存" })).toBeDefined();
  expect(getByText("Distinction")).toBeDefined();
  expect(document.querySelector(".mantine-ColorSwatch-root")).not.toBeNull();
});
