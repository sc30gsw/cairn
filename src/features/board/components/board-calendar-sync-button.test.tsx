import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { act, fireEvent, waitFor, within } from "@testing-library/react";
import { Result } from "better-result";
import { beforeEach, expect, test, vi } from "vite-plus/test";

import {
  BOARD_CALENDAR_SYNC_TOOLTIP,
  BoardCalendarSyncButton,
} from "~/features/board/components/board-calendar-sync-button";
import {
  clearCalendarSyncConnectPending,
  linkGoogleCalendar,
  readCalendarSyncConnectPending,
} from "~/features/board/lib/calendar-sync-actions";
import { BoardSearchSchema } from "~/features/board/schemas/board-search-schema";
import { authClient } from "~/lib/auth-client";
import { renderWithMantine } from "~/test-utils/render";

const { connect } = vi.hoisted(() => ({ connect: vi.fn().mockResolvedValue("ok") }));

vi.mock("~/hooks/use-calendar-sync", () => ({
  useCalendarSyncStatus: () => ({ data: null }),
  useConnectCalendarSync: () => connect,
  useDisconnectCalendarSync: () => vi.fn(),
  useSetVisibleCalendars: () => vi.fn(),
  useSyncCalendarNow: () => vi.fn(),
}));

vi.mock("~/lib/auth-client", () => ({
  authClient: { linkSocial: vi.fn().mockResolvedValue({ data: null, error: null }) },
}));

vi.mock("~/lib/notify", () => ({ notifyError: vi.fn(), notifySuccess: vi.fn() }));

async function renderBoard(initialEntry: string) {
  const root = createRootRoute();
  const board = createRoute({
    component: BoardCalendarSyncButton,
    getParentRoute: () => root,
    path: "/board",
    validateSearch: BoardSearchSchema,
  });
  const router = createRouter({
    history: createMemoryHistory({ initialEntries: [initialEntry] }),
    routeTree: root.addChildren([board]),
  });
  await router.load();
  return { ...renderWithMantine(<RouterProvider router={router} />), router };
}

beforeEach(() => {
  vi.clearAllMocks();
  clearCalendarSyncConnectPending();
});

test("キーボードでTooltipを確認でき、設定の開閉後も予定の表示位置を保持する", async () => {
  const view = await renderBoard("/board?tab=schedule&week=2026-08-31");
  const button = view.getByRole("button", { name: "カレンダー同期" });
  act(() => button.focus());
  await waitFor(() => {
    expect(view.getByRole("tooltip", { hidden: true }).textContent).toBe(
      BOARD_CALENDAR_SYNC_TOOLTIP,
    );
  });
  fireEvent.click(button);
  const dialog = await view.findByRole("dialog", { hidden: true, name: "カレンダー同期" });
  expect(
    within(dialog).getByRole("button", { hidden: true, name: "Google カレンダーと連携" }),
  ).toBeDefined();
  expect(view.router.state.location.searchStr).toContain("calendarSync=true");
  fireEvent.click(
    within(dialog).getByRole("button", { hidden: true, name: "カレンダー同期を閉じる" }),
  );
  await waitFor(() => {
    expect(view.router.state.location.searchStr).not.toContain("calendarSync");
  });
  expect(view.router.state.location.searchStr).toContain("tab=schedule");
  expect(view.router.state.location.searchStr).toContain("week=2026-08-31");
});

test("Googleの同意後はboardの予定タブで設定を開き、連携の仕上げを一度だけ実行する", async () => {
  expect(Result.isOk(await linkGoogleCalendar())).toBe(true);
  const request = vi.mocked(authClient.linkSocial).mock.calls[0]?.[0];
  const callback = new URL(request?.callbackURL ?? "");
  expect(callback.pathname).toBe("/board");
  expect(callback.searchParams.get("tab")).toBe("schedule");
  expect(request?.errorCallbackURL).toBe(request?.callbackURL);

  const view = await renderBoard(`${callback.pathname}${callback.search}`);
  expect(await view.findByRole("dialog", { hidden: true, name: "カレンダー同期" })).toBeDefined();
  await waitFor(() => expect(connect).toHaveBeenCalledTimes(1));
  expect(readCalendarSyncConnectPending()).toBe(false);
});
