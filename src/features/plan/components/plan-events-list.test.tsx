import { fireEvent, waitFor } from "@testing-library/react";
import { expect, test, vi } from "vite-plus/test";

import type { Id } from "~/../convex/_generated/dataModel";
import {
  PLAN_EVENTS_FILTER_ALL_LABEL,
  PLAN_EVENTS_LIST_CLOSE_TOOLTIP,
  PLAN_EVENTS_LIST_OPEN_TOOLTIP,
  PLAN_EVENTS_SORT_PRIORITY_LABEL,
  PlanEventsList,
} from "~/features/plan/components/plan-events-list";
import type { PlanCatalogItem, PlanEventDto } from "~/features/plan/types/plan";
import { renderWithMantine } from "~/test-utils/render";

const liveQuery = vi.hoisted(() => ({
  data: undefined as PlanEventDto[] | undefined,
  isReady: false,
  lastScope: undefined as
    | { anchorDateJst: string; priority?: string; sort?: string; view: string }
    | undefined,
}));

vi.mock("~/lib/tanstack-db/collections", () => ({
  useOptionalPlanEventsLiveQuery: (scope: {
    anchorDateJst: string;
    priority?: string;
    sort?: string;
    view: string;
  }) => {
    liveQuery.lastScope = scope;
    return { data: liveQuery.data, isReady: liveQuery.isReady };
  },
}));

const morning: PlanEventDto = {
  _id: "event-high" as Id<"planEvents">,
  dateJst: "2026-09-21",
  endTime: "10:00",
  itemId: "item-1" as Id<"items">,
  priority: "high",
  recordState: { kind: "materialized", status: "確定" },
  startTime: "09:00",
  title: "朝の多読",
};

const skipped: PlanEventDto = {
  _id: "event-skip" as Id<"planEvents">,
  dateJst: "2026-09-21",
  endTime: "12:00",
  itemId: "item-2" as Id<"items">,
  priority: "low",
  recordState: { kind: "materialized", status: "スキップ" },
  startTime: "11:00",
  title: "単語",
};

const items: PlanCatalogItem[] = [
  {
    _id: "item-1" as Id<"items">,
    categoryId: "c1" as PlanCatalogItem["categoryId"],
    name: "多読",
    sortOrder: 0,
  },
  {
    _id: "item-2" as Id<"items">,
    categoryId: "c1" as PlanCatalogItem["categoryId"],
    name: "単語",
    sortOrder: 1,
  },
];

test("予定一覧は予定0件でも出し、開くと空コピーが出る", async () => {
  liveQuery.isReady = false;
  liveQuery.data = undefined;
  const view = renderWithMantine(
    <PlanEventsList
      dateJst="2026-09-21"
      eventsFallback={[]}
      items={items}
      onSelectEvent={() => {}}
    />,
  );

  const toggle = view.getByRole("button", { name: PLAN_EVENTS_LIST_OPEN_TOOLTIP });
  expect(toggle.getAttribute("aria-expanded")).toBe("false");
  expect(view.queryByText("この日の予定はまだありません。")).toBeNull();

  fireEvent.click(toggle);
  expect(toggle.getAttribute("aria-expanded")).toBe("true");
  expect(view.getByRole("button", { name: PLAN_EVENTS_LIST_CLOSE_TOOLTIP })).toBeDefined();
  await waitFor(() => {
    expect(view.getByText("この日の予定はまだありません。")).toBeDefined();
  });
});

test("折りたたみを開くと Badge と取り消し線が出る", async () => {
  liveQuery.isReady = false;
  liveQuery.data = undefined;
  const view = renderWithMantine(
    <PlanEventsList
      dateJst="2026-09-21"
      eventsFallback={[morning, skipped]}
      items={items}
      onSelectEvent={() => {}}
    />,
  );

  fireEvent.click(view.getByRole("button", { name: PLAN_EVENTS_LIST_OPEN_TOOLTIP }));
  await waitFor(() => {
    expect(view.getByText("多読")).toBeDefined();
  });
  expect(view.getByText("完了")).toBeDefined();
  expect(view.getByText("見送り")).toBeDefined();
  expect(view.getByText("単語")).toBeDefined();
  expect(view.getByText("完了").closest(".mantine-Badge-root")?.getAttribute("data-variant")).toBe(
    "light",
  );
  expect(view.getByText("多読").className).toContain("line-through");
  expect(view.queryByText("Banana")).toBeNull();
});

test("優先度で並べると live query に sort を渡す", async () => {
  liveQuery.isReady = true;
  liveQuery.data = [morning];
  const view = renderWithMantine(
    <PlanEventsList
      dateJst="2026-09-21"
      eventsFallback={[morning]}
      items={items}
      onSelectEvent={() => {}}
    />,
  );

  fireEvent.click(view.getByRole("button", { name: PLAN_EVENTS_LIST_OPEN_TOOLTIP }));
  fireEvent.click(view.getByRole("combobox", { name: "並べ方" }));
  fireEvent.click(await view.findByRole("option", { name: PLAN_EVENTS_SORT_PRIORITY_LABEL }));
  expect(liveQuery.lastScope).toEqual({
    anchorDateJst: "2026-09-21",
    priority: undefined,
    sort: "priority",
    view: "day",
  });
});

test("優先度のすべてを選ぶと絞り込みを外す", async () => {
  liveQuery.isReady = true;
  liveQuery.data = [morning];
  const view = renderWithMantine(
    <PlanEventsList
      dateJst="2026-09-21"
      eventsFallback={[morning]}
      items={items}
      onSelectEvent={() => {}}
    />,
  );

  fireEvent.click(view.getByRole("button", { name: PLAN_EVENTS_LIST_OPEN_TOOLTIP }));
  fireEvent.click(view.getByRole("combobox", { name: "優先度" }));
  fireEvent.click(await view.findByRole("option", { name: "高" }));
  expect(liveQuery.lastScope?.priority).toBe("high");
  fireEvent.click(view.getByRole("combobox", { name: "優先度" }));
  fireEvent.click(await view.findByRole("option", { name: PLAN_EVENTS_FILTER_ALL_LABEL }));
  expect(liveQuery.lastScope?.priority).toBeUndefined();
});
