import { expect, test, vi } from "vite-plus/test";

import { TrashList } from "~/features/trash/components/trash-list";
import { renderWithMantine } from "~/test-utils/render";

test("ゴミ箱と復元・完全削除が見える", () => {
  const onRestoreRow = vi.fn();
  const onPurgeRow = vi.fn();
  const { getAllByRole, getByText } = renderWithMantine(
    <TrashList
      onPurgeDay={vi.fn()}
      onPurgeRow={onPurgeRow}
      onRestoreDay={vi.fn()}
      onRestoreRow={onRestoreRow}
      trash={{
        days: [{ _id: "d1" as never, dateJst: "2026-08-17", deletedAt: 1 }],
        rows: [
          {
            _id: "r1" as never,
            content: "Unit 1",
            dateJst: "2026-08-17",
            deletedAt: 1,
            itemName: "Distinction 2000",
            minutes: 30,
            status: "確定",
          },
        ],
      }}
    />,
  );
  expect(getByText(/Distinction 2000/)).toBeDefined();
  expect(getByText(/Unit 1 30分/)).toBeDefined();
  getAllByRole("button", { name: "戻す" })[1]?.click();
  expect(onRestoreRow).toHaveBeenCalled();
  getAllByRole("button", { name: "完全削除" })[1]?.click();
  getAllByRole("button", { name: "完全削除" }).at(-1)?.click();
  expect(onPurgeRow).toHaveBeenCalled();
});
