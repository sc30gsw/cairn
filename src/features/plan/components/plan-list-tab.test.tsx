import { fireEvent, within } from "@testing-library/react";
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

vi.mock("~/hooks/use-obstacle-plans", () => ({
  useObstaclePlans: () => ({
    obstacles: [],
    onCreateObstacle: vi.fn(async () => Result.ok(null)),
    onRemoveObstacle: vi.fn(async () => Result.ok(null)),
    onUpdateObstacle: vi.fn(async () => Result.ok(null)),
  }),
}));

vi.mock("~/lib/tanstack-db/collections", () => ({
  useOptionalGoalsLiveQuery: () => ({ data: undefined, isReady: false }),
}));

vi.mock("~/features/plan/hooks/plan-mutations", () => ({
  usePlanTemplateApply: () => ({ mutateAsync: vi.fn(async () => ({ applied: true })) }),
  usePlanTemplateRemove: () => ({ mutateAsync: vi.fn(async () => null) }),
  usePlanTemplateSave: () => ({ mutateAsync: vi.fn(async () => "tmpl-1") }),
  usePlanTemplateSetForgotten: () => ({ mutateAsync: vi.fn(async () => null) }),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: { children?: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));

vi.mock("@convex-dev/react-query", () => ({
  convexQuery: () => ({ queryKey: ["plan-templates"] }),
}));

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useSuspenseQueries: () => [{ data: [] }, { data: [] }],
  };
});

afterEach(() => {
  planView.selectedDateJst = "2026-09-21";
  setDate.mockClear();
});

test("プランタブは日付カレンダー・Clock・予定入力を出し、祝日を出す", () => {
  const view = renderWithMantine(<PlanListTab />);

  expect(view.getByLabelText("日付を選択")).toBeDefined();
  expect(view.queryByRole("textbox", { name: "日付を選択" })).toBeNull();
  expect([...view.getByLabelText("23 9月 2026").classList]).toContain(
    calendarDayStyleClasses.holidayDay,
  );
  expect(view.getByLabelText("23 9月 2026").getAttribute("title")).toBe("秋分の日");
  expect(view.getByRole("complementary", { name: "一日の時計" })).toBeDefined();
  expect(view.getByText("予定に載らない確定 12分")).toBeDefined();
  expect(view.getByText("朝の多読")).toBeDefined();
  expect(view.getByText("09:00–10:00")).toBeDefined();
  expect(view.getByRole("button", { name: "予定を追加" })).toBeDefined();
  expect(view.getByRole("heading", { name: "計画プリセット" })).toBeDefined();
  expect(view.getByRole("heading", { name: "目標" })).toBeDefined();
  expect(view.getByText("障害プラン")).toBeDefined();
});

test("Clock は complementary セクションにありカレンダーとは別", () => {
  const view = renderWithMantine(<PlanListTab />);
  const clockSection = view.getByRole("complementary", { name: "一日の時計" });

  expect(within(clockSection).getByLabelText("一日の時計")).toBeDefined();
  expect(within(clockSection).queryByLabelText("日付を選択")).toBeNull();
  expect(view.getByLabelText("日付を選択")).toBeDefined();
});

test("予定カードをクリックすると予定を編集と削除が出る", () => {
  const view = renderWithMantine(<PlanListTab />);
  fireEvent.click(view.getByText("朝の多読"));

  expect(view.getByRole("dialog", { hidden: true }).textContent).toContain("予定を編集");
  expect(view.getByRole("button", { hidden: true, name: "削除" })).toBeDefined();
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
