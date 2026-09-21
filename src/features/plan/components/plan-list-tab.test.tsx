import { fireEvent } from "@testing-library/react";
import { Result } from "better-result";
import { afterEach, expect, test, vi } from "vite-plus/test";

import type { Id } from "~/../convex/_generated/dataModel";
import { PLAN_CLOCK_HEADING } from "~/features/plan/components/plan-clock";
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

function documentPositionFollows(earlier: Node, later: Node) {
  return (earlier.compareDocumentPosition(later) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
}

test("プランタブは日と同じ学習日ナビと Clock・予定入力を出す", () => {
  const view = renderWithMantine(<PlanListTab />);

  expect(view.getByLabelText("学習日")).toBeDefined();
  expect(view.queryByLabelText("日付を選択")).toBeNull();
  expect(view.queryByRole("button", { name: "2026年9月" })).toBeNull();
  expect(view.queryByLabelText("23 9月 2026")).toBeNull();
  expect(view.getByRole("button", { name: "前の日" })).toBeDefined();
  expect((view.getByRole("button", { name: "次の日" }) as HTMLButtonElement).disabled).toBe(true);
  expect(view.queryByRole("button", { name: "今日へ戻る" })).toBeNull();
  expect(view.queryByRole("button", { name: "今日" })).toBeNull();
  expect(view.getByRole("heading", { name: PLAN_CLOCK_HEADING })).toBeDefined();
  expect(view.getByLabelText(PLAN_CLOCK_HEADING)).toBeDefined();
  expect(view.queryByRole("complementary")).toBeNull();
  expect(view.getByText("予定に載らない確定 12分")).toBeDefined();
  expect(view.getByText("朝の多読")).toBeDefined();
  expect(view.getByText("09:00–10:00")).toBeDefined();
  expect(view.getByRole("button", { name: "予定を追加" })).toBeDefined();
  expect(view.getByRole("heading", { name: "計画プリセット" })).toBeDefined();
  expect(view.getByRole("heading", { name: "目標" })).toBeDefined();
  expect(view.getByText("障害プラン")).toBeDefined();
});

test("Clock は計画プリセット・目標・障害プランのあと、同じカード列の末尾にある", () => {
  const view = renderWithMantine(<PlanListTab />);
  const dateNav = view.getByLabelText("学習日");
  const clockHeading = view.getByRole("heading", { name: PLAN_CLOCK_HEADING });
  const templatesHeading = view.getByRole("heading", { name: "計画プリセット" });
  const goalsHeading = view.getByRole("heading", { name: "目標" });
  const obstaclesHeading = view.getByRole("heading", { name: "障害プラン" });

  expect(view.queryByRole("complementary")).toBeNull();
  expect(view.getByLabelText(PLAN_CLOCK_HEADING)).toBeDefined();
  expect(documentPositionFollows(dateNav, templatesHeading)).toBe(true);
  expect(documentPositionFollows(templatesHeading, goalsHeading)).toBe(true);
  expect(documentPositionFollows(goalsHeading, obstaclesHeading)).toBe(true);
  expect(documentPositionFollows(obstaclesHeading, clockHeading)).toBe(true);
  expect(clockHeading.closest(".mantine-Card-root")?.querySelector("svg")).not.toBeNull();
  expect(dateNav.closest(".mantine-Card-root")).toBeNull();
});

test("予定カードをクリックすると予定を編集と削除が出る", () => {
  const view = renderWithMantine(<PlanListTab />);
  fireEvent.click(view.getByText("朝の多読"));

  expect(view.getByRole("dialog", { hidden: true }).textContent).toContain("予定を編集");
  expect(view.getByRole("button", { hidden: true, name: "削除" })).toBeDefined();
});

test("前の日で選択日が変わる", () => {
  const view = renderWithMantine(<PlanListTab />);
  fireEvent.click(view.getByRole("button", { name: "前の日" }));
  expect(setDate).toHaveBeenCalledWith("2026-09-20");
});

test("別日なら学習日はコンパクト表示で今日へ戻るが出る", () => {
  planView.selectedDateJst = "2026-10-15";
  const view = renderWithMantine(<PlanListTab />);

  expect(view.getByLabelText("学習日").textContent).toBe("2026/10/15");
  expect(view.queryByRole("button", { name: "2026年10月" })).toBeNull();
  expect(view.queryByRole("button", { name: "2026年9月" })).toBeNull();
  fireEvent.click(view.getByRole("button", { name: "今日へ戻る" }));
  expect(setDate).toHaveBeenCalledWith("2026-09-21");
});

test("学習日ピッカーを開くと祝日が出る", async () => {
  const view = renderWithMantine(<PlanListTab />);
  fireEvent.click(view.getByLabelText("学習日"));
  const holiday = await view.findByLabelText("23 9月 2026");
  expect([...holiday.classList]).toContain(calendarDayStyleClasses.holidayDay);
  expect(holiday.getAttribute("title")).toBe("秋分の日");
});
