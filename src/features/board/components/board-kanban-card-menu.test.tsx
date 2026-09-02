import { fireEvent, waitFor } from "@testing-library/react";
import { expect, test, vi } from "vite-plus/test";

import { BoardKanbanCardMenu } from "~/features/board/components/board-kanban-card-menu";
import type { BoardRow } from "~/features/board/types/board";
import { renderWithMantine } from "~/test-utils/render";

function row(id: string, status: BoardRow["status"], name: string): BoardRow {
  return {
    _id: id as BoardRow["_id"],
    category: "多聴",
    categorySortOrder: 1,
    content: "Unit 1",
    itemId: "i1" as BoardRow["itemId"],
    itemName: name,
    minutes: 30,
    review: null,
    sortOrder: 0,
    status,
    timer: null,
  };
}

test("未着手の行は 進行中 / 完了 / 見送り を出し、状態の生値は出さない", async () => {
  const target = row("r1", "未着手", "金のフレーズ");
  const { getByRole, queryByRole } = renderWithMantine(
    <BoardKanbanCardMenu
      disabled={false}
      onFlagReview={vi.fn()}
      onShift={vi.fn()}
      onStatusMove={vi.fn(async () => undefined)}
      onUnflagReview={vi.fn()}
      row={target}
      rows={[target]}
      todayJst="2026-08-17"
    />,
  );

  fireEvent.click(getByRole("button", { name: "金のフレーズ の操作" }));

  await waitFor(() => {
    expect(getByRole("menuitem", { hidden: true, name: "進行中にする" })).toBeDefined();
  });
  expect(getByRole("menuitem", { hidden: true, name: "完了にする" })).toBeDefined();
  expect(getByRole("menuitem", { hidden: true, name: "見送りにする" })).toBeDefined();
  expect(queryByRole("menuitem", { hidden: true, name: "確定にする" })).toBeNull();
  expect(queryByRole("menuitem", { hidden: true, name: "スキップにする" })).toBeNull();
});

test("「完了にする」で onStatusMove('confirm', row) が呼ばれる", async () => {
  const target = row("r1", "未着手", "金のフレーズ");
  const onStatusMove = vi.fn(async () => undefined);
  const { getByRole } = renderWithMantine(
    <BoardKanbanCardMenu
      disabled={false}
      onFlagReview={vi.fn()}
      onShift={vi.fn()}
      onStatusMove={onStatusMove}
      onUnflagReview={vi.fn()}
      row={target}
      rows={[target]}
      todayJst="2026-08-17"
    />,
  );

  fireEvent.click(getByRole("button", { name: "金のフレーズ の操作" }));
  fireEvent.click(await waitFor(() => getByRole("menuitem", { hidden: true, name: "完了にする" })));

  expect(onStatusMove).toHaveBeenCalledWith("confirm", target);
});

test("列に1行しかなければ 上へ / 下へ は出ない", async () => {
  const target = row("r1", "未着手", "金のフレーズ");
  const { getByRole, queryByRole } = renderWithMantine(
    <BoardKanbanCardMenu
      disabled={false}
      onFlagReview={vi.fn()}
      onShift={vi.fn()}
      onStatusMove={vi.fn(async () => undefined)}
      onUnflagReview={vi.fn()}
      row={target}
      rows={[target]}
      todayJst="2026-08-17"
    />,
  );

  fireEvent.click(getByRole("button", { name: "金のフレーズ の操作" }));

  await waitFor(() => {
    expect(getByRole("menuitem", { hidden: true, name: "完了にする" })).toBeDefined();
  });
  expect(queryByRole("menuitem", { hidden: true, name: "上へ" })).toBeNull();
  expect(queryByRole("menuitem", { hidden: true, name: "下へ" })).toBeNull();
});

test("列の先頭行では「上へ」が出ず、「下へ」で onShift(1, row) が呼ばれる", async () => {
  const first = row("r1", "未着手", "金のフレーズ");
  const second = row("r2", "未着手", "Distinction 2000");
  const onShift = vi.fn();
  const { getByRole, queryByRole } = renderWithMantine(
    <BoardKanbanCardMenu
      disabled={false}
      onFlagReview={vi.fn()}
      onShift={onShift}
      onStatusMove={vi.fn(async () => undefined)}
      onUnflagReview={vi.fn()}
      row={first}
      rows={[first, second]}
      todayJst="2026-08-17"
    />,
  );

  fireEvent.click(getByRole("button", { name: "金のフレーズ の操作" }));
  fireEvent.click(await waitFor(() => getByRole("menuitem", { hidden: true, name: "下へ" })));

  expect(queryByRole("menuitem", { hidden: true, name: "上へ" })).toBeNull();
  expect(onShift).toHaveBeenCalledWith(1, first);
});

test("確定した行のメニューには復習の期日が並び、選ぶと onFlagReview に行と日付が渡る", async () => {
  const target = { ...row("r1", "確定", "金のフレーズ"), review: null };
  const onFlagReview = vi.fn();
  const { getByRole, queryByRole } = renderWithMantine(
    <BoardKanbanCardMenu
      disabled={false}
      onFlagReview={onFlagReview}
      onShift={vi.fn()}
      onStatusMove={vi.fn(async () => undefined)}
      onUnflagReview={vi.fn()}
      row={target}
      rows={[target]}
      todayJst="2026-08-17"
    />,
  );

  fireEvent.click(getByRole("button", { name: "金のフレーズ の操作" }));
  await waitFor(() => {
    expect(getByRole("menuitem", { hidden: true, name: "7日後に復習" })).toBeDefined();
  });
  expect(queryByRole("menuitem", { hidden: true, name: "復習をやめる" })).toBeNull();
  fireEvent.click(getByRole("menuitem", { hidden: true, name: "7日後に復習" }));

  expect(onFlagReview).toHaveBeenCalledWith(target, "2026-08-24");
});

test("未着手の行のメニューには復習の項目が無い", async () => {
  const target = row("r1", "未着手", "金のフレーズ");
  const { getByRole, queryByRole } = renderWithMantine(
    <BoardKanbanCardMenu
      disabled={false}
      onFlagReview={vi.fn()}
      onShift={vi.fn()}
      onStatusMove={vi.fn(async () => undefined)}
      onUnflagReview={vi.fn()}
      row={target}
      rows={[target]}
      todayJst="2026-08-17"
    />,
  );

  fireEvent.click(getByRole("button", { name: "金のフレーズ の操作" }));
  await waitFor(() => {
    expect(getByRole("menuitem", { hidden: true, name: "進行中にする" })).toBeDefined();
  });
  expect(queryByRole("menuitem", { hidden: true, name: /日後に復習/ })).toBeNull();
});
