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

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: { children?: ReactNode; to: string }) => <a href={to}>{children}</a>,
}));

vi.mock("~/features/board/hooks/use-board-kanban-actions", () => ({
  useBoardKanbanActions: () => ({
    onApplyOrder: noop,
    onConfirm: onConfirmMock,
    onPause: noop,
    onReopen: noop,
    onResumeTimer: noop,
    onSkip: noop,
    onStart: noop,
    onStopTimer: onStopTimerMock,
    onUnconfirm: noop,
    onUnskip: noop,
  }),
}));

beforeEach(() => {
  onConfirmMock.mockClear();
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
  expect(onStopTimerMock).toHaveBeenCalledWith("r1");
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
