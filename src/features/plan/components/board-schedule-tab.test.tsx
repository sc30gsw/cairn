import { expect, test, vi } from "vite-plus/test";

import { BoardScheduleTab } from "~/features/plan/components/board-schedule-tab";
import { renderWithMantine } from "~/test-utils/render";

vi.mock("~/features/plan/components/board-schedule", () => ({
  BoardSchedule: () => <div>予定カレンダー</div>,
}));

vi.mock("~/features/plan/hooks/use-plan-view", () => ({
  usePlanView: () => ({
    scheduleAnchor: "2026-09-21",
    scheduleView: "day",
    selectedDateJst: "2026-09-21",
    today: "2026-09-21",
  }),
}));

vi.mock("~/features/plan/hooks/use-plan-window", () => ({
  planWindowQuery: () => ({ queryKey: ["plan-window"] }),
  usePlanWindow: () => ({ events: [], isDone: true, unplannedConfirmedMinutes: 0 }),
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
    queryOptions: (options: unknown) => options,
    usePrefetchQuery: () => undefined,
    useSuspenseQueries: () => [{ data: [] }],
  };
});

test("スケジュールタブは Clock を出さない", () => {
  const view = renderWithMantine(<BoardScheduleTab />);
  expect(view.getByText("予定カレンダー")).toBeDefined();
  expect(view.queryByLabelText("一日の時計")).toBeNull();
});
