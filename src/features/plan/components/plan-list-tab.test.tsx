import { fireEvent } from "@testing-library/react";
import { Result } from "better-result";
import { afterEach, expect, test, vi } from "vite-plus/test";

import type { Id } from "~/../convex/_generated/dataModel";
import { PlanListTab } from "~/features/plan/components/plan-list-tab";
import { calendarDayStyleClasses } from "~/lib/calendar-day-style";
import { renderWithMantine } from "~/test-utils/render";

const { planView, setDate } = vi.hoisted(() => {
  const setDate = vi.fn();
  return {
    planView: {
      selectedDateJst: "2026-09-21",
      setDate,
      today: "2026-09-21",
    },
    setDate,
  };
});

vi.mock("~/features/plan/hooks/use-plan-view", () => ({
  usePlanView: () => planView,
}));

vi.mock("~/features/plan/hooks/use-plan-window", () => ({
  usePlanWindow: () => ({
    events: [
      {
        _id: "event-1" as Id<"planEvents">,
        dateJst: "2026-09-21",
        endTime: "10:00",
        itemId: "item-1" as Id<"items">,
        priority: "high",
        recordState: { kind: "awaiting-open" },
        startTime: "09:00",
        title: "朝の多読",
      },
    ],
    isDone: true,
    unplannedConfirmedMinutes: 12,
  }),
}));

vi.mock("~/hooks/use-items-list", () => ({
  useItemsList: () => ({ data: [] }),
}));

vi.mock("~/features/plan/hooks/use-board-schedule-actions", () => ({
  useBoardScheduleActions: () => ({
    onCreateBlock: vi.fn(async () => Result.ok(null)),
    onRemoveBlock: vi.fn(async () => Result.ok(null)),
    onUpdateBlock: vi.fn(async () => Result.ok(null)),
  }),
}));

afterEach(() => {
  planView.selectedDateJst = "2026-09-21";
  setDate.mockClear();
});

test("プランタブは日付カレンダー・Clock・予定入力を並べ、祝日を出す", () => {
  const view = renderWithMantine(<PlanListTab />);

  expect(view.getByLabelText("日付を選択")).toBeDefined();
  expect(view.queryByRole("textbox", { name: "日付を選択" })).toBeNull();
  expect([...view.getByLabelText("23 9月 2026").classList]).toContain(
    calendarDayStyleClasses.holidayDay,
  );
  expect(view.getByLabelText("23 9月 2026").getAttribute("title")).toBe("秋分の日");
  expect(view.getByLabelText("一日の時計")).toBeDefined();
  expect(view.getByText("予定に載らない確定 12分")).toBeDefined();
  expect(view.getByText("朝の多読")).toBeDefined();
  expect(view.getByText("09:00–10:00")).toBeDefined();
  expect(view.getByRole("button", { name: "予定を追加" })).toBeDefined();
});

test("カレンダーの日付を選ぶと選択日が変わる", () => {
  const view = renderWithMantine(<PlanListTab />);
  fireEvent.click(view.getByLabelText("25 9月 2026"));
  expect(setDate).toHaveBeenCalledWith("2026-09-25");
});

test("選択日が別月ならカレンダーの表示月もその月になる", () => {
  planView.selectedDateJst = "2026-10-15";
  const view = renderWithMantine(<PlanListTab />);
  expect(view.getByRole("button", { name: "2026年10月" })).toBeDefined();
  expect(view.queryByRole("button", { name: "2026年9月" })).toBeNull();
});

test("今日は表示月を今日に戻す", () => {
  const view = renderWithMantine(<PlanListTab />);
  const nextMonth = view.getByLabelText("日付を選択").querySelector('[data-direction="next"]');
  if (!(nextMonth instanceof HTMLElement)) {
    throw new Error("翌月ボタンがない");
  }
  fireEvent.click(nextMonth);
  expect(view.getByRole("button", { name: "2026年10月" })).toBeDefined();
  fireEvent.click(view.getByRole("button", { name: "今日" }));
  expect(view.getByRole("button", { name: "2026年9月" })).toBeDefined();
  expect(setDate).toHaveBeenCalledWith("2026-09-21");
});
