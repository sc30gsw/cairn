import { fireEvent } from "@testing-library/react";
import { expect, test, vi } from "vite-plus/test";

import type { Id } from "~/../convex/_generated/dataModel";
import { PlanListTab } from "~/features/plan/components/plan-list-tab";
import type { PlanEventDto } from "~/features/plan/types/plan";
import { calendarDayStyleClasses } from "~/lib/calendar-day-style";
import { renderWithMantine } from "~/test-utils/render";

const { setDate, usePlanWindow } = vi.hoisted(() => ({
  setDate: vi.fn(),
  usePlanWindow: vi.fn(),
}));

const confirmed: PlanEventDto = {
  _id: "arc-1" as Id<"planEvents">,
  dateJst: "2026-09-21",
  endTime: "08:15",
  itemId: "item-1" as Id<"items">,
  priority: "high",
  recordState: { kind: "materialized", status: "確定" },
  startTime: "07:00",
  title: "公式問題集 Part 7",
};

const idle: PlanEventDto = {
  _id: "idle-1" as Id<"planEvents">,
  dateJst: "2026-09-21",
  endTime: "21:00",
  priority: "low",
  recordState: { kind: "not-applicable" },
  startTime: "20:00",
  title: "X を見る",
};

vi.mock("~/features/plan/hooks/use-plan-view", () => ({
  usePlanView: () => ({
    monthDate: new Date("2026-09-01T12:00:00+09:00"),
    resetMonthViewToToday: vi.fn(),
    scheduleAnchor: "2026-09-21",
    scheduleView: "week",
    selectedDateJst: "2026-09-21",
    setDate,
    setMonth: vi.fn(),
    setScheduleView: vi.fn(),
    setTab: vi.fn(),
    setWeek: vi.fn(),
    tab: "plan",
    today: "2026-09-21",
    weekAnchor: "2026-09-21",
    yearMonth: "2026-09",
  }),
}));

vi.mock("~/features/plan/hooks/use-plan-window", () => ({
  usePlanWindow,
}));

vi.mock("~/hooks/use-items-list", () => ({
  useItemsList: () => ({ data: [] }),
}));

vi.mock("~/features/plan/hooks/use-board-schedule-actions", () => ({
  useBoardScheduleActions: () => ({
    onCreateBlock: vi.fn(),
    onMoveBlock: vi.fn(),
    onMoveExternal: vi.fn(),
    onRemoveBlock: vi.fn(),
    onRemoveExternal: vi.fn(),
    onUpdateBlock: vi.fn(),
  }),
}));

vi.mock("@convex-dev/react-query", () => ({
  convexQuery: () => ({ queryKey: ["plan-templates"] }),
}));

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useSuspenseQuery: () => ({ data: [] }),
  };
});

vi.mock("~/features/plan/hooks/plan-mutations", () => ({
  usePlanTemplateApply: () => ({ mutateAsync: vi.fn() }),
  usePlanTemplateRemove: () => ({ mutateAsync: vi.fn() }),
  usePlanTemplateSave: () => ({ mutateAsync: vi.fn() }),
  usePlanTemplateSetForgotten: () => ({ mutateAsync: vi.fn() }),
}));

usePlanWindow.mockReturnValue({
  events: [confirmed, idle],
  isDone: true,
  unplannedConfirmedMinutes: 40,
});

test("プランタブは祝日つきカレンダーの下に Clock、右に予定入力を置く", () => {
  const view = renderWithMantine(<PlanListTab />);

  const holiday = view.getByLabelText("23 9月 2026");
  const clock = view.getByLabelText("一日の時計");
  const add = view.getByRole("button", { name: "予定を追加" });
  const templates = view.getByRole("heading", { name: "計画プリセット" });

  expect([...holiday.classList]).toContain(calendarDayStyleClasses.holidayDay);
  expect(holiday.getAttribute("title")).toBe("秋分の日");
  expect(clock.querySelectorAll("path")).toHaveLength(1);
  expect(view.getByText("予定に載らない確定 40分")).toBeDefined();
  expect(view.getByText("公式問題集 Part 7")).toBeDefined();
  expect(view.getByText("X を見る")).toBeDefined();
  expect(view.queryByRole("button", { name: "日付を選択" })).toBeNull();
  expect(holiday.compareDocumentPosition(clock) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
  expect(clock.compareDocumentPosition(add) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
  expect(add.compareDocumentPosition(templates) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
  expect(usePlanWindow).toHaveBeenCalledWith("2026-09-21", "day");
});

test("プランタブのカレンダーは日付を選ぶ", () => {
  const view = renderWithMantine(<PlanListTab />);
  fireEvent.click(view.getByLabelText("23 9月 2026"));
  expect(setDate).toHaveBeenCalledWith("2026-09-23");
});
