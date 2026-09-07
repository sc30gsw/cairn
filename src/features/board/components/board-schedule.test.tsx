import { fireEvent, within } from "@testing-library/react";
import { expect, test, vi } from "vite-plus/test";

import { BoardSchedule } from "~/features/board/components/board-schedule";
import { deriveBoardView } from "~/features/board/hooks/use-board-view";
import type { BoardExternalEvent } from "~/features/board/types/board";
import { renderWithMantine } from "~/test-utils/render";

vi.mock("~/features/board/hooks/use-board-schedule-actions", () => ({
  useBoardScheduleActions: () => ({
    onCreateBlock: vi.fn(),
    onMoveBlock: vi.fn(),
    onMoveExternal: vi.fn(),
    onRemoveBlock: vi.fn(),
    onRemoveExternal: vi.fn(),
    onUpdateBlock: vi.fn(),
  }),
}));

const external: BoardExternalEvent = {
  _id: "external-holiday" as BoardExternalEvent["_id"],
  allDay: true,
  calendarId: "holidays",
  calendarName: "日本の祝日",
  calendarEmail: "owner@example.com",
  colorId: null,
  canEdit: false,
  color: "red",
  externalReadOnly: false,
  startAt: "2026-09-23 00:00:00",
  endAt: "2026-09-23 23:59:59",
  title: "秋分の日",
};

function renderSchedule(level: "week" | "month" | "year") {
  return renderWithMantine(
    <BoardSchedule
      blocks={[]}
      externals={[external]}
      rows={[]}
      view={{
        ...deriveBoardView({ date: "2026-09-23", view: level, tab: "schedule" }, "2026-09-30"),
        today: "2026-09-30",
        resetMonthViewToToday: vi.fn(),
        setDate: vi.fn(),
        setMonth: vi.fn(),
        setScheduleView: vi.fn(),
        setTab: vi.fn(),
        setWeek: vi.fn(),
      }}
    />,
  );
}

test("月表示で連携した祝日予定を表示し、詳細を開く", async () => {
  const view = renderSchedule("month");
  fireEvent.click(view.getByText("秋分の日"));
  const dialog = await view.findByRole("dialog", { hidden: true });
  expect(within(dialog).getByText("日本の祝日")).toBeDefined();
});

test("年表示で連携予定の日にマーカーを表示し、予定を確認できる", async () => {
  const view = renderSchedule("year");
  const day = view.getByRole("button", { name: "9月 23, 2026" });
  expect(day.querySelectorAll('[style*="background"]')).toHaveLength(1);
  const target = day.querySelector("span");
  if (target === null) throw new Error("日付の表示がありません");
  fireEvent.mouseEnter(target);
  expect(await view.findByText("秋分の日")).toBeDefined();
});
