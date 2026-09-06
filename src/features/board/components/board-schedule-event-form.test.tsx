import { fireEvent, waitFor } from "@testing-library/react";
import { Result } from "better-result";
import { expect, test, vi } from "vite-plus/test";

import { BoardScheduleEventForm } from "~/features/board/components/board-schedule-event-form";
import type { BoardRow } from "~/features/board/types/board";
import { renderWithMantine } from "~/test-utils/render";

const onSubmit = vi.fn(async () => Result.ok(null));

function sampleRow(id: string, name: string): BoardRow {
  return {
    _id: id as BoardRow["_id"],
    category: "多聴",
    categorySortOrder: 1,
    content: "",
    itemId: "i1" as BoardRow["itemId"],
    itemName: name,
    minutes: 0,
    review: null,
    sortOrder: 0,
    status: "未着手",
    timer: null,
  };
}

test("通常予定もGoogleの11色から選択して保存できる", async () => {
  const start = new Date("2026-08-17T00:00:00.000Z");
  const end = new Date("2026-08-17T01:00:00.000Z");
  const { getByRole, getByText, findByRole, getAllByRole } = renderWithMantine(
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
  fireEvent.click(getByRole("combobox", { name: "色" }));
  fireEvent.click(await findByRole("option", { name: "Graphite" }));
  fireEvent.click(getByRole("combobox", { name: "色" }));
  expect(getAllByRole("option")).toHaveLength(11);
  fireEvent.click(getByRole("option", { name: "Graphite" }));
  fireEvent.click(getByRole("button", { name: "保存" }));
  await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
  expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ color: "gray" }));
});
