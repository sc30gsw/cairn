import { fireEvent } from "@testing-library/react";
import { Result } from "better-result";
import { expect, test, vi } from "vite-plus/test";

import type { Id } from "~/../convex/_generated/dataModel";
import { PlanListTab } from "~/features/plan/components/plan-list-tab";
import { calendarDayStyleClasses } from "~/lib/calendar-day-style";
import { renderWithMantine } from "~/test-utils/render";

const setDate = vi.fn();

vi.mock("~/features/plan/hooks/use-plan-view", () => ({
  usePlanView: () => ({
    selectedDateJst: "2026-09-21",
    setDate,
    today: "2026-09-21",
  }),
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
  expect(view.getByRole("button", { name: "予定を追加" })).toBeDefined();
});

test("カレンダーの日付を選ぶと選択日が変わる", () => {
  const view = renderWithMantine(<PlanListTab />);
  fireEvent.click(view.getByLabelText("25 9月 2026"));
  expect(setDate).toHaveBeenCalledWith("2026-09-25");
});
