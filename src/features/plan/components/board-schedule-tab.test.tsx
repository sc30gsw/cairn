import { expect, test, vi } from "vite-plus/test";

import { BoardScheduleTab } from "~/features/plan/components/board-schedule-tab";
import { renderWithMantine } from "~/test-utils/render";

vi.mock("~/features/plan/components/board-schedule", () => ({
  BoardSchedule: () => <div>予定カレンダー</div>,
}));

vi.mock("~/features/plan/hooks/use-plan-view", () => ({
  usePlanView: () => ({
    monthDate: new Date("2026-09-01T12:00:00+09:00"),
    resetMonthViewToToday: vi.fn(),
    scheduleAnchor: "2026-09-21",
    scheduleView: "day",
    selectedDateJst: "2026-09-21",
    setDate: vi.fn(),
    setMonth: vi.fn(),
    setScheduleView: vi.fn(),
    setTab: vi.fn(),
    setWeek: vi.fn(),
    tab: "schedule",
    today: "2026-09-21",
    weekAnchor: "2026-09-21",
    yearMonth: "2026-09",
  }),
}));

vi.mock("~/features/plan/hooks/use-plan-window", () => ({
  planWindowQuery: () => ({ queryKey: ["plan-window"] }),
  usePlanWindow: () => ({
    events: [],
    isDone: true,
    unplannedConfirmedMinutes: 40,
  }),
}));

vi.mock("~/hooks/use-items-list", () => ({
  itemsListQuery: () => ({ queryKey: ["items"] }),
  useItemsList: () => ({ data: [] }),
}));

vi.mock("~/hooks/use-calendar-sync", () => ({
  useSyncCalendarOnOpen: () => undefined,
}));

vi.mock("~/lib/tanstack-db/collections", () => ({
  useOptionalExternalCalendarEventsLiveQuery: () => ({ data: undefined, isReady: false }),
}));

vi.mock("@convex-dev/react-query", () => ({
  convexQuery: () => ({ queryKey: ["externals"] }),
}));

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    queryOptions: <T,>(options: T) => options,
    usePrefetchQuery: () => undefined,
    useSuspenseQueries: () => [{ data: [] }],
  };
});

test("スケジュールタブの日表示は Clock を出さない", () => {
  const view = renderWithMantine(<BoardScheduleTab />);
  expect(view.getByText("予定カレンダー")).toBeDefined();
  expect(view.queryByLabelText("一日の時計")).toBeNull();
  expect(view.queryByText("予定に載らない確定 40分")).toBeNull();
});
