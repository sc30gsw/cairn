import { screen } from "@testing-library/react";
import { expect, test, vi } from "vite-plus/test";

import { BoardKanbanDateNavigation } from "~/features/board/components/board-kanban-date-navigation";
import { BoardKanbanTab } from "~/features/board/components/board-kanban-tab";
import { renderWithMantine } from "~/test-utils/render";

const setDate = vi.fn();

vi.mock("~/features/board/hooks/use-board-view", () => ({
  useBoardView: () => ({
    selectedDateJst: "2026-08-15",
    setDate,
    today: "2026-08-17",
  }),
}));

vi.mock("~/hooks/use-open-and-load-day", () => ({
  useOpenAndLoadDay: () => ({
    data: {
      rows: [
        {
          _id: "r1",
          category: "多聴",
          categorySortOrder: 1,
          content: "",
          itemId: "i1",
          itemName: "Distinction 2000",
          minutes: 30,
          sortOrder: 0,
          status: "未着手",
          timer: null,
        },
      ],
    },
  }),
}));

vi.mock("~/features/board/hooks/use-board-kanban-actions", () => ({
  useBoardKanbanActions: () => ({
    onApplyOrder: vi.fn(),
    onConfirm: vi.fn(),
    onPause: vi.fn(),
    onReopen: vi.fn(),
    onSkip: vi.fn(),
    onStart: vi.fn(),
    onUnconfirm: vi.fn(),
    onUnskip: vi.fn(),
  }),
}));

vi.mock("~/hooks/use-dnd", async () => {
  const dnd = await vi.importActual<typeof import("@hello-pangea/dnd")>("@hello-pangea/dnd");
  return { useDnd: () => dnd };
});

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: { children?: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));

test("カンバン日付ナビは学習日ピッカーと日ページリンクを出す", () => {
  renderWithMantine(<BoardKanbanDateNavigation />);

  expect(screen.getByLabelText("学習日")).toBeDefined();
  expect(screen.getByLabelText("前の日")).toBeDefined();
  expect(screen.getByLabelText("次の日")).toBeDefined();
  expect(screen.getByLabelText("今日へ戻る")).toBeDefined();
  expect(screen.getByText("2026-08-15 の記録を編集する")).toBeDefined();
});

test("カンバンタブは選択中の日付の行を表示する", () => {
  renderWithMantine(<BoardKanbanTab />);

  expect(screen.getByText("Distinction 2000")).toBeDefined();
});

test("前の日ボタンで search.date を更新する", () => {
  setDate.mockClear();
  renderWithMantine(<BoardKanbanDateNavigation />);

  screen.getByLabelText("前の日").click();
  expect(setDate).toHaveBeenCalledWith("2026-08-14");
});
