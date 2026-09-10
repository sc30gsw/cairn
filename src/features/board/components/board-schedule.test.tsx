import { fireEvent, waitFor, within } from "@testing-library/react";
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
  meetingUrl: null,
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

test("年表示はホバーなしで日を選び、読み取り専用の予定を確認して閉じられる", async () => {
  const view = renderSchedule("year");
  const day = view.getByRole("button", { name: "9月 23, 2026" });

  day.focus();
  fireEvent.click(day);

  const dialog = await view.findByRole("dialog", { name: "2026-09-23の予定", hidden: true });
  expect(day.getAttribute("aria-expanded")).toBe("true");
  expect(day.getAttribute("aria-controls")).toBe(dialog.id);
  expect(within(dialog).getByText("秋分の日")).toBeDefined();
  expect(within(dialog).queryByRole("button", { name: /秋分の日/, hidden: true })).toBeNull();
  expect(
    within(dialog)
      .getByRole("button", { name: "予定を追加", hidden: true })
      .hasAttribute("disabled"),
  ).toBe(true);

  fireEvent.keyDown(dialog, { key: "Escape" });

  await waitFor(() => expect(day.getAttribute("aria-expanded")).toBe("false"));
});

test("年表示は予定のない日も選択でき、閉じるボタンで一覧を閉じられる", async () => {
  const view = renderSchedule("year");
  const day = view.getByRole("button", { name: "9月 24, 2026" });
  fireEvent.click(day);

  const dialog = await view.findByRole("dialog", { name: "2026-09-24の予定", hidden: true });
  expect(within(dialog).getAllByText("なし")).toHaveLength(2);
  fireEvent.click(within(dialog).getByRole("button", { name: "予定一覧を閉じる", hidden: true }));

  await waitFor(() => expect(day.getAttribute("aria-expanded")).toBe("false"));
});

test("ホバー後に選択した年表示の日を閉じると、選択した日へフォーカスが戻る", async () => {
  const view = renderSchedule("year");
  const previousDay = view.getByRole("button", { name: "9月 22, 2026" });
  const day = view.getByRole("button", { name: "9月 23, 2026" });
  previousDay.focus();
  const target = day.querySelector("span");
  if (target === null) throw new Error("日付の表示がありません");
  fireEvent.mouseEnter(target);
  await view.findByRole("dialog", { name: "2026-09-23の予定", hidden: true });
  day.focus();
  fireEvent.click(day);
  const dialog = view.getByRole("dialog", { name: "2026-09-23の予定", hidden: true });
  within(dialog).getByRole("button", { name: "予定一覧を閉じる", hidden: true }).focus();
  fireEvent.keyDown(dialog, { key: "Escape" });

  await waitFor(() => {
    expect(day.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(day);
  });
}, 20_000);
