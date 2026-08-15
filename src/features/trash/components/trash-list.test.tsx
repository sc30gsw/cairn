import { expect, test, vi } from "vite-plus/test";

import { TrashList } from "~/features/trash/components/trash-list";
import { renderWithMantine } from "~/test-utils/render";

test("ゴミ箱と復元が見える", () => {
  const onRestoreRow = vi.fn();
  const { getByText, getByRole } = renderWithMantine(
    <TrashList
      onRestoreDay={vi.fn()}
      onRestoreRow={onRestoreRow}
      trash={{
        days: [{ _id: "d1" as never, dateJst: "2026-08-17", deletedAt: 1 }],
        rows: [
          { _id: "r1" as never, dateJst: "2026-08-17", deletedAt: 1, itemName: "Distinction 2000" },
        ],
      }}
    />,
  );
  expect(getByText("2026-08-17")).toBeDefined();
  expect(getByText(/Distinction 2000/)).toBeDefined();
  getByRole("button", { name: "この行を戻す" }).click();
  expect(onRestoreRow).toHaveBeenCalled();
});
