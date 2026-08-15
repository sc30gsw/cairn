import { fireEvent, waitFor, within } from "@testing-library/react";
import { expect, test, vi } from "vite-plus/test";
import { STATUSES } from "~domain/domain";

import { TrashList } from "~/features/trash/components/trash-list";
import type { TrashPage } from "~/features/trash/types/trash";
import { renderWithMantine } from "~/test-utils/render";

const [confirmed] = [STATUSES[0]] as const;

test("ゴミ箱と復元・完全削除が見える", async () => {
  const onRestoreRow = vi.fn();
  const onPurgeRow = vi.fn();
  const trash = {
    days: [{ _id: "d1" as never, dateJst: "2026-08-17", deletedAt: 1 }],
    rows: [
      {
        _id: "r1" as never,
        content: "Unit 1",
        dateJst: "2026-08-17",
        deletedAt: 1,
        itemName: "Distinction 2000",
        minutes: 30,
        status: confirmed,
      },
    ],
  } satisfies TrashPage;

  const { getAllByRole, getByText } = renderWithMantine(
    <TrashList
      onPurgeDay={vi.fn()}
      onPurgeRow={onPurgeRow}
      onRestoreDay={vi.fn()}
      onRestoreRow={onRestoreRow}
      trash={trash}
    />,
  );
  expect(getByText(/Distinction 2000/)).toBeDefined();
  expect(getByText(/Unit 1 30分/)).toBeDefined();
  getAllByRole("button", { name: "戻す" })[1]?.click();
  expect(onRestoreRow).toHaveBeenCalled();
  fireEvent.click(getAllByRole("button", { name: "完全削除" })[1]!);
  await waitFor(() => {
    expect(getByText(/を完全に削除します/)).toBeDefined();
  });
  fireEvent.click(within(document.body).getAllByRole("button", { name: "完全削除" }).at(-1)!);
  expect(onPurgeRow).toHaveBeenCalled();
});
