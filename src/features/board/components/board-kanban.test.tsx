import { fireEvent, waitFor } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vite-plus/test";
import { STATUSES } from "~domain/domain";

import { BoardKanban } from "~/features/board/components/board-kanban";
import type { BoardRow } from "~/features/board/types/board";
import { renderWithMantine } from "~/test-utils/render";

const [confirmed, pending, ongoing, skipped] = STATUSES;

const noop = vi.fn(async () => undefined);
const onConfirmMock = vi.fn(async () => null);
const onStopTimerMock = vi.fn(async (): Promise<number | null> => 754_000);
const onApplyOrderMock = vi.fn(async () => undefined);
const onSkipMock = vi.fn(async () => undefined);
const onPauseMock = vi.fn(async () => undefined);
const onUnconfirmMock = vi.fn(async () => undefined);

const { notificationsShowMock } = vi.hoisted(() => ({ notificationsShowMock: vi.fn() }));
vi.mock("@mantine/notifications", () => ({
  notifications: { hide: vi.fn(), show: notificationsShowMock },
}));

vi.mock("~/features/board/hooks/board-mutations", () => ({
  useBoardApplyRowOrder: () => ({ mutateAsync: onApplyOrderMock }),
  useBoardConfirmRow: () => ({ mutateAsync: onConfirmMock }),
  useBoardPauseRow: () => ({ mutateAsync: onPauseMock }),
  useBoardReopenRow: () => ({ mutateAsync: noop }),
  useBoardResumeRowTimer: () => ({ mutateAsync: noop }),
  useBoardSkipRow: () => ({ mutateAsync: onSkipMock }),
  useBoardStartRow: () => ({ mutateAsync: noop }),
  useBoardStopRowTimer: () => ({ mutateAsync: onStopTimerMock }),
  useBoardUnconfirmRow: () => ({ mutateAsync: onUnconfirmMock }),
  useBoardUnskipRow: () => ({ mutateAsync: noop }),
}));

beforeEach(() => {
  noop.mockClear();
  onApplyOrderMock.mockClear();
  onConfirmMock.mockClear();
  onPauseMock.mockClear();
  onSkipMock.mockClear();
  onStopTimerMock.mockClear();
  onUnconfirmMock.mockClear();
  notificationsShowMock.mockClear();
});

vi.mock("~/hooks/use-dnd", async () => {
  const dnd = await vi.importActual<typeof import("@hello-pangea/dnd")>("@hello-pangea/dnd");
  return {
    useDnd: () => dnd,
  };
});

function row(
  id: string,
  status: BoardRow["status"],
  name: string,
  overrides: Partial<BoardRow> = {},
): BoardRow {
  return {
    _id: id as BoardRow["_id"],
    category: "多聴",
    categorySortOrder: 1,
    content: "",
    itemId: "i1" as BoardRow["itemId"],
    itemName: name,
    minutes: 30,
    sortOrder: 0,
    status,
    timer: null,
    ...overrides,
  };
}

function successToasts() {
  return notificationsShowMock.mock.calls
    .map((call) => call[0] as { color?: string; message?: string })
    .filter((args) => args.color === "green");
}

function hasSuccessToast(message: string) {
  return successToasts().some((toast) => toast.message === message);
}

test("カンバンは未着手・進行中・確定・スキップを並べる", () => {
  const { getAllByText, getByLabelText, getByText } = renderWithMantine(
    <BoardKanban
      dateJst="2026-08-17"
      rows={[
        row("r1", pending, "Distinction 2000"),
        row("r2", confirmed, "金のフレーズ"),
        row("r3", skipped, "英会話"),
      ]}
    />,
  );

  expect(getAllByText("未着手").length).toBeGreaterThanOrEqual(1);
  expect(getByText("進行中")).toBeDefined();
  expect(getByText("確定")).toBeDefined();
  expect(getByText("スキップ")).toBeDefined();
  expect(getByText("Distinction 2000")).toBeDefined();
  expect(getByText("金のフレーズ")).toBeDefined();
  expect(getByText("英会話")).toBeDefined();
  expect(getByLabelText("Distinction 2000 の順序を変更")).toBeDefined();
});

test("列は名前付きの束で、各列に件数が付く", () => {
  const { getByLabelText, getByRole } = renderWithMantine(
    <BoardKanban
      dateJst="2026-08-17"
      rows={[row("r1", pending, "Distinction 2000"), row("r2", pending, "金のフレーズ")]}
    />,
  );

  expect(getByRole("region", { name: "カンバンの列" })).toBeDefined();
  expect(getByLabelText("未着手 2件")).toBeDefined();
  expect(getByLabelText("確定 0件")).toBeDefined();
});

test("計測がある進行中の行を確定すると、stopTimer の分数でモーダルなしに確定する", async () => {
  const { getByRole, queryByLabelText } = renderWithMantine(
    <BoardKanban
      dateJst="2026-08-17"
      rows={[
        row("r1", ongoing, "金のフレーズ", {
          content: "Unit 1",
          minutes: 30,
          timer: { accumulatedMs: 754_000, autoStoppedAt: null, startedAt: null },
        }),
      ]}
    />,
  );

  getByRole("button", { name: "確定する" }).click();

  await vi.waitFor(() => {
    expect(onConfirmMock).toHaveBeenCalledWith({ content: "Unit 1", minutes: 13, rowId: "r1" });
    expect(hasSuccessToast("学習時間 13分を記録しました")).toBe(true);
  });
  expect(onStopTimerMock).toHaveBeenCalledWith({ rowId: "r1" });
  expect(queryByLabelText("分数")).toBeNull();
});

test("stopTimer が失敗したら安全側でエディタを開く", async () => {
  onStopTimerMock.mockResolvedValueOnce(null);
  const { findByLabelText, getByRole } = renderWithMantine(
    <BoardKanban
      dateJst="2026-08-17"
      rows={[
        row("r1", ongoing, "金のフレーズ", {
          content: "Unit 1",
          minutes: 30,
          timer: { accumulatedMs: 754_000, autoStoppedAt: null, startedAt: null },
        }),
      ]}
    />,
  );

  getByRole("button", { name: "確定する" }).click();

  const minutesInput = await findByLabelText("分数");
  expect(onConfirmMock).not.toHaveBeenCalled();
  expect((minutesInput as HTMLInputElement).value).toBe("30");
});

test("計測が無く内容と分数が埋まった行はモーダルなしで確定する", async () => {
  const { getByRole, queryByLabelText } = renderWithMantine(
    <BoardKanban
      dateJst="2026-08-17"
      rows={[row("r2", ongoing, "Distinction 2000", { content: "Unit 1", minutes: 30 })]}
    />,
  );

  getByRole("button", { name: "確定する" }).click();

  await vi.waitFor(() => {
    expect(onConfirmMock).toHaveBeenCalledWith({
      content: "Unit 1",
      minutes: 30,
      rowId: "r2",
    });
    expect(hasSuccessToast("学習時間 30分を記録しました")).toBe(true);
  });
  expect(onStopTimerMock).not.toHaveBeenCalled();
  expect(queryByLabelText("分数")).toBeNull();
});

test("計測が無く分数が0の行は確定エディタを開く", async () => {
  const { findByLabelText, getByRole } = renderWithMantine(
    <BoardKanban
      dateJst="2026-08-17"
      rows={[row("r2", ongoing, "Distinction 2000", { content: "", minutes: 0 })]}
    />,
  );

  getByRole("button", { name: "確定する" }).click();

  const minutesInput = await findByLabelText("分数");
  expect(onConfirmMock).not.toHaveBeenCalled();
  expect((minutesInput as HTMLInputElement).value).toBe("0");
});

test("メニューから完了にすると、計測がある行は stopTimer の分数でモーダルなしに確定する", async () => {
  const { getByRole, queryByLabelText } = renderWithMantine(
    <BoardKanban
      dateJst="2026-08-17"
      rows={[
        row("r1", ongoing, "金のフレーズ", {
          content: "Unit 1",
          minutes: 30,
          timer: { accumulatedMs: 754_000, autoStoppedAt: null, startedAt: null },
        }),
      ]}
    />,
  );

  fireEvent.click(getByRole("button", { name: "金のフレーズ の操作" }));
  fireEvent.click(await waitFor(() => getByRole("menuitem", { hidden: true, name: "完了にする" })));

  await vi.waitFor(() => {
    expect(onConfirmMock).toHaveBeenCalledWith({ content: "Unit 1", minutes: 13, rowId: "r1" });
  });
  expect(onStopTimerMock).toHaveBeenCalledWith({ rowId: "r1" });
  expect(queryByLabelText("分数")).toBeNull();
});

test("メニューから完了にすると、計測が無く埋まった行は直接確定される", async () => {
  const { getByRole, queryByLabelText } = renderWithMantine(
    <BoardKanban
      dateJst="2026-08-17"
      rows={[row("r2", pending, "Distinction 2000", { content: "Unit 1", minutes: 30 })]}
    />,
  );

  fireEvent.click(getByRole("button", { name: "Distinction 2000 の操作" }));
  fireEvent.click(await waitFor(() => getByRole("menuitem", { hidden: true, name: "完了にする" })));

  await vi.waitFor(() => {
    expect(onConfirmMock).toHaveBeenCalledWith({
      content: "Unit 1",
      minutes: 30,
      rowId: "r2",
    });
  });
  expect(onStopTimerMock).not.toHaveBeenCalled();
  expect(queryByLabelText("分数")).toBeNull();
});

test("メニューから見送りにすると、確認なしで即座にスキップされ、破棄分数を Toast で伝える", async () => {
  const { getByRole } = renderWithMantine(
    <BoardKanban
      dateJst="2026-08-17"
      rows={[
        row("r1", ongoing, "金のフレーズ", {
          content: "Unit 1",
          timer: { accumulatedMs: 754_000, autoStoppedAt: null, startedAt: null },
        }),
      ]}
    />,
  );

  fireEvent.click(getByRole("button", { name: "金のフレーズ の操作" }));
  fireEvent.click(
    await waitFor(() => getByRole("menuitem", { hidden: true, name: "見送りにする" })),
  );

  await vi.waitFor(() => {
    expect(onSkipMock).toHaveBeenCalledWith({ rowId: "r1" });
    expect(hasSuccessToast("計測 13分を捨てました")).toBe(true);
  });
  expect(document.querySelector('[role="dialog"]')).toBeNull();
});

test("メニューから未着手に戻すと、確認なしで即座に一時停止され、破棄分数を Toast で伝える", async () => {
  const { getByRole } = renderWithMantine(
    <BoardKanban
      dateJst="2026-08-17"
      rows={[
        row("r1", ongoing, "金のフレーズ", {
          content: "Unit 1",
          timer: { accumulatedMs: 754_000, autoStoppedAt: null, startedAt: null },
        }),
      ]}
    />,
  );

  fireEvent.click(getByRole("button", { name: "金のフレーズ の操作" }));
  fireEvent.click(
    await waitFor(() => getByRole("menuitem", { hidden: true, name: "未着手に戻す" })),
  );

  await vi.waitFor(() => {
    expect(onPauseMock).toHaveBeenCalledWith({ rowId: "r1" });
    expect(hasSuccessToast("計測 13分を捨てました")).toBe(true);
  });
  expect(document.querySelector('[role="dialog"]')).toBeNull();
});

test("確定した行のメニューから未着手に戻すと、確認なしで即座に確定が取り消される", async () => {
  const { getByRole } = renderWithMantine(
    <BoardKanban dateJst="2026-08-17" rows={[row("r1", confirmed, "金のフレーズ")]} />,
  );

  fireEvent.click(getByRole("button", { name: "金のフレーズ の操作" }));
  fireEvent.click(
    await waitFor(() => getByRole("menuitem", { hidden: true, name: "未着手に戻す" })),
  );

  await vi.waitFor(() => {
    expect(onUnconfirmMock).toHaveBeenCalledWith({ rowId: "r1" });
    expect(hasSuccessToast("確定を取り消しました")).toBe(true);
  });
  expect(onPauseMock).not.toHaveBeenCalled();
  expect(document.querySelector('[role="dialog"]')).toBeNull();
});

test("計測が無いスキップは Toast を出さない", async () => {
  const { getByRole } = renderWithMantine(
    <BoardKanban dateJst="2026-08-17" rows={[row("r1", pending, "Distinction 2000")]} />,
  );

  fireEvent.click(getByRole("button", { name: "Distinction 2000 の操作" }));
  fireEvent.click(
    await waitFor(() => getByRole("menuitem", { hidden: true, name: "見送りにする" })),
  );

  await vi.waitFor(() => {
    expect(onSkipMock).toHaveBeenCalledWith({ rowId: "r1" });
  });
  expect(successToasts()).toEqual([]);
});

test("メニューの「下へ」は同じ列の並べ替えを送る", async () => {
  const { getByRole } = renderWithMantine(
    <BoardKanban
      dateJst="2026-08-17"
      rows={[row("r1", pending, "Distinction 2000"), row("r2", pending, "金のフレーズ")]}
    />,
  );

  fireEvent.click(getByRole("button", { name: "Distinction 2000 の操作" }));
  fireEvent.click(await waitFor(() => getByRole("menuitem", { hidden: true, name: "下へ" })));

  await vi.waitFor(() => {
    expect(onApplyOrderMock).toHaveBeenCalledWith({
      dateJst: "2026-08-17",
      orderedRowIds: ["r2", "r1"],
    });
  });
});
