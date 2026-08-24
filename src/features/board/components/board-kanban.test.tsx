import { fireEvent, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, expect, test, vi } from "vite-plus/test";
import { STATUSES } from "~domain/domain";

import { BoardKanban } from "~/features/board/components/board-kanban";
import type { BoardObstacle, BoardRow } from "~/features/board/types/board";
import { renderWithMantine } from "~/test-utils/render";

const [confirmed, pending, ongoing, skipped] = STATUSES;

const noop = vi.fn(async () => undefined);
const onConfirmMock = vi.fn(async () => undefined);
const onStopTimerMock = vi.fn(async () => 754_000);
const onApplyOrderMock = vi.fn(async () => undefined);
const onSkipMock = vi.fn(async () => undefined);

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: { children?: ReactNode; to: string }) => <a href={to}>{children}</a>,
}));

//? フックそのものは実物を走らせる(確定手順は use-board-kanban-actions の onStatusMove が持つ ―
//? #58 §11.3)。差し替えるのはその下の mutation 層だけ。
vi.mock("~/features/board/hooks/board-mutations", () => ({
  useBoardApplyRowOrder: () => ({ mutateAsync: onApplyOrderMock }),
  useBoardConfirmRow: () => ({ mutateAsync: onConfirmMock }),
  useBoardPauseRow: () => ({ mutateAsync: noop }),
  useBoardReopenRow: () => ({ mutateAsync: noop }),
  useBoardResumeRowTimer: () => ({ mutateAsync: noop }),
  useBoardSkipRow: () => ({ mutateAsync: onSkipMock }),
  useBoardStartRow: () => ({ mutateAsync: noop }),
  useBoardStopRowTimer: () => ({ mutateAsync: onStopTimerMock }),
  useBoardUnconfirmRow: () => ({ mutateAsync: noop }),
  useBoardUnskipRow: () => ({ mutateAsync: noop }),
}));

beforeEach(() => {
  noop.mockClear();
  onApplyOrderMock.mockClear();
  onConfirmMock.mockClear();
  onSkipMock.mockClear();
  onStopTimerMock.mockClear();
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

test("カンバンは未着手・進行中・確定・スキップとチェックポイントを並べる", () => {
  const obstacle = {
    _id: "o1" as BoardObstacle["_id"],
    ifText: "眠い",
    thenText: "金フレを1ページだけ開く",
  } satisfies BoardObstacle;

  const { getAllByText, getByLabelText, getByRole, getByText } = renderWithMantine(
    <BoardKanban
      checkpointLabel="Part 2 を聞き取る（2026-08-20）"
      dateJst="2026-08-17"
      obstacles={[obstacle]}
      rows={[
        row("r1", pending, "Distinction 2000"),
        row("r2", confirmed, "金のフレーズ"),
        row("r3", skipped, "英会話"),
      ]}
    />,
  );

  expect(getAllByText("未着手").length).toBeGreaterThanOrEqual(2);
  expect(getByText("進行中")).toBeDefined();
  expect(getByText("確定")).toBeDefined();
  expect(getByText("スキップ")).toBeDefined();
  expect(getAllByText("チェックポイント").length).toBeGreaterThanOrEqual(2);
  expect(getByText("Distinction 2000")).toBeDefined();
  expect(getByText("金のフレーズ")).toBeDefined();
  expect(getByText("英会話")).toBeDefined();
  expect(getByText("金フレを1ページだけ開く")).toBeDefined();
  expect(getByText("Part 2 を聞き取る（2026-08-20）")).toBeDefined();
  expect(getByRole("link", { name: /Distinction 2000/ }).getAttribute("href")).toBe("/");
  expect(getByRole("link", { name: /金フレを1ページだけ開く/ }).getAttribute("href")).toBe(
    "/goals",
  );
  expect(getByLabelText("Distinction 2000 の順序を変更")).toBeDefined();
});

//? #58 §11.1: モバイルは横スナップの列。支援技術からは名前付きの束と件数で見える。
test("列は名前付きの束で、各列に件数が付く", () => {
  const { getByLabelText, getByRole } = renderWithMantine(
    <BoardKanban
      checkpointLabel={null}
      dateJst="2026-08-17"
      obstacles={[]}
      rows={[row("r1", pending, "Distinction 2000"), row("r2", pending, "金のフレーズ")]}
    />,
  );

  expect(getByRole("region", { name: "カンバンの列" })).toBeDefined();
  expect(getByLabelText("未着手 2件")).toBeDefined();
  expect(getByLabelText("確定 0件")).toBeDefined();
});

//? #51 §11.3: 計測がある行の確定は「サーバで区間を閉じる → 計測値でプレフィルされたモーダル」の順。
test("計測がある進行中の行を確定すると stopTimer が先に走り、モーダルが計測値で開く", async () => {
  const { findByLabelText, getByRole } = renderWithMantine(
    <BoardKanban
      checkpointLabel={null}
      dateJst="2026-08-17"
      obstacles={[]}
      rows={[
        row("r1", ongoing, "金のフレーズ", {
          content: "Unit 1",
          minutes: 30,
          timer: { accumulatedMs: 754_000, autoStoppedAt: null, startedAt: null },
        }),
      ]}
    />,
  );

  getByRole("button", { name: "確定" }).click();

  const minutesInput = await findByLabelText("分数");
  expect(onStopTimerMock).toHaveBeenCalledWith({ rowId: "r1" });
  expect(onConfirmMock).not.toHaveBeenCalled();
  expect((minutesInput as HTMLInputElement).value).toBe("13");
});

//? 既存の振る舞いの回帰: 計測が無く content と minutes が埋まった行はモーダルなしで確定する。
test("計測が無く内容と分数が埋まった行はモーダルなしで確定する", async () => {
  const { getByRole, queryByLabelText } = renderWithMantine(
    <BoardKanban
      checkpointLabel={null}
      dateJst="2026-08-17"
      obstacles={[]}
      rows={[row("r2", ongoing, "Distinction 2000", { content: "Unit 1", minutes: 30 })]}
    />,
  );

  getByRole("button", { name: "確定" }).click();
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

//* #58 §11.2 / §17: メニュー経路の確定はドラッグ経路と同じ手順を通る。
//? #51 が塞いだ「目安分数のまま確定して計測を捨てる」バグの回帰テスト。
test("メニューから完了にすると、計測がある行は stopTimer の解決後に計測値でモーダルが開く", async () => {
  const { findByLabelText, getByRole } = renderWithMantine(
    <BoardKanban
      checkpointLabel={null}
      dateJst="2026-08-17"
      obstacles={[]}
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

  const minutesInput = await findByLabelText("分数");
  expect(onStopTimerMock).toHaveBeenCalledWith({ rowId: "r1" });
  //? row.minutes(30) では確定されない。
  expect(onConfirmMock).not.toHaveBeenCalled();
  expect((minutesInput as HTMLInputElement).value).toBe("13");
});

test("メニューから完了にすると、計測が無く埋まった行は直接確定される", async () => {
  const { getByRole, queryByLabelText } = renderWithMantine(
    <BoardKanban
      checkpointLabel={null}
      dateJst="2026-08-17"
      obstacles={[]}
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

//* #51 §13.4 / #58 §11.3: 計測を捨てる移動は、メニュー経路でも必ず Confirm を通る。
test("メニューから見送りにすると、確認してからスキップされる", async () => {
  const { findByRole, getByRole } = renderWithMantine(
    <BoardKanban
      checkpointLabel={null}
      dateJst="2026-08-17"
      obstacles={[]}
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

  const dialog = await findByRole("dialog");
  expect(within(dialog).getByText(/計測した13分は残りません/)).toBeDefined();
  expect(onSkipMock).not.toHaveBeenCalled();

  within(dialog).getByRole("button", { name: "見送りにする" }).click();
  await vi.waitFor(() => {
    expect(onSkipMock).toHaveBeenCalledWith({ rowId: "r1" });
  });
});

test("見送りの確認をキャンセルすると、スキップは走らない", async () => {
  const { findByRole, getByRole } = renderWithMantine(
    <BoardKanban
      checkpointLabel={null}
      dateJst="2026-08-17"
      obstacles={[]}
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

  const dialog = await findByRole("dialog");
  within(dialog).getByRole("button", { name: "キャンセル" }).click();

  await waitFor(() => {
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });
  expect(onSkipMock).not.toHaveBeenCalled();
  //? 並べ替えを預けるのはドラッグ経路だけ。取り消しでどちらも動かない。
  expect(onApplyOrderMock).not.toHaveBeenCalled();
});

test("メニューの「下へ」は同じ列の並べ替えを送る", async () => {
  const { getByRole } = renderWithMantine(
    <BoardKanban
      checkpointLabel={null}
      dateJst="2026-08-17"
      obstacles={[]}
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
