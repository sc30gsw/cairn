import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { act, fireEvent, waitFor, within } from "@testing-library/react";
import { Result } from "better-result";
import type { FunctionReturnType } from "convex/server";
import { beforeEach, expect, test, vi } from "vite-plus/test";

import type { api } from "~/../convex/_generated/api";
import {
  BOARD_CALENDAR_SYNC_TOOLTIP,
  BoardCalendarSyncButton,
} from "~/features/board/components/board-calendar-sync-button";
import { BoardSearchSchema } from "~/features/board/schemas/board-search-schema";
import { authClient } from "~/lib/auth-client";
import {
  clearCalendarSyncConnectPending,
  linkGoogleCalendar,
  readCalendarSyncConnectPending,
} from "~/lib/calendar-sync-actions";
import { renderWithMantine } from "~/test-utils/render";

type Authorization = FunctionReturnType<typeof api.mutations.calendarAuth.begin.begin>;
const AUTHORIZATION: Authorization = {
  requestId: "authorization-1" as Authorization["requestId"],
  scopes: ["calendar.readonly"],
};

const { connect, syncState } = vi.hoisted(() => ({
  connect: vi.fn().mockResolvedValue("ok"),
  syncState: { failed: false },
}));

vi.mock("~/hooks/use-calendar-sync", () => ({
  useBeginCalendarAuthorization: () => vi.fn(),
  useCalendarSyncStatus: () => ({
    data: {
      connections: syncState.failed ? [{ status: "needsReauth" }] : [],
      output: null,
      outputChanging: false,
    },
  }),
  useSetCalendarOutput: () => vi.fn(),
  useRetryCalendarOutput: () => vi.fn(),
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
  syncState.failed = false;
  window.history.replaceState(null, "", "/");
  clearCalendarSyncConnectPending();
});

test("キーボードでTooltipを確認でき、設定の開閉後も予定の表示位置を保持する", async () => {
  const view = await renderBoard("/board?tab=schedule&week=2026-08-31");
  const button = view.getByRole("button", { name: "Google カレンダー連携" });
  act(() => button.focus());
  await waitFor(() => {
    expect(view.getByRole("tooltip", { hidden: true }).textContent).toBe(
      BOARD_CALENDAR_SYNC_TOOLTIP,
    );
  });
  fireEvent.click(button);
  const dialog = await view.findByRole("dialog", { hidden: true, name: "Google カレンダー連携" });
  expect(
    within(dialog).getByRole("button", { hidden: true, name: "Google カレンダーと連携" }),
  ).toBeDefined();
  expect(view.router.state.location.searchStr).toContain("calendarSync=true");
  fireEvent.click(
    within(dialog).getByRole("button", { hidden: true, name: "Google カレンダー連携を閉じる" }),
  );
  await waitFor(() => {
    expect(view.router.state.location.searchStr).not.toContain("calendarSync");
  });
  expect(view.router.state.location.searchStr).toContain("tab=schedule");
  expect(view.router.state.location.searchStr).toContain("week=2026-08-31");
});

test("Googleの同意後はboardの予定タブで設定を開き、連携の仕上げを一度だけ実行する", async () => {
  window.history.replaceState(null, "", "/board?tab=schedule&calendarSync=true&week=2026-08-31");
  expect(Result.isOk(await linkGoogleCalendar(AUTHORIZATION))).toBe(true);
  const request = vi.mocked(authClient.linkSocial).mock.calls[0]?.[0];
  const callback = new URL(request?.callbackURL ?? "");
  expect(callback.pathname).toBe("/board");
  expect(callback.searchParams.get("tab")).toBe("schedule");
  expect(request?.errorCallbackURL).toBe(request?.callbackURL);

  window.history.replaceState(null, "", `${callback.pathname}${callback.search}`);
  const view = await renderBoard(`${callback.pathname}${callback.search}`);
  expect(
    await view.findByRole("dialog", { hidden: true, name: "Google カレンダー連携" }),
  ).toBeDefined();
  await waitFor(() => expect(connect).toHaveBeenCalledTimes(1));
  expect(readCalendarSyncConnectPending()).toBeNull();
});

test.each(["/board", "/board?tab=kanban&calendarSync=true"])(
  "%sでは連携ボタンを表示しない",
  async (url) => {
    const view = await renderBoard(url);
    expect(view.queryByRole("button", { name: "Google カレンダー連携" })).toBeNull();
    expect(view.queryByRole("dialog")).toBeNull();
  },
);

test("アカウント設定からの連携はエラーを除去して元の画面に戻る", async () => {
  window.history.replaceState(null, "", "/my-page?error=access_denied&error_description=old");
  await linkGoogleCalendar(AUTHORIZATION);
  const request = vi.mocked(authClient.linkSocial).mock.calls[0]?.[0];
  expect(new URL(request?.callbackURL ?? "").pathname).toBe("/my-page");
  const returned = new URL(request?.callbackURL ?? "");
  expect(returned.searchParams.get("error")).toBeNull();
  expect(returned.searchParams.get("error_description")).toBeNull();
  expect(returned.searchParams.get("calendarRequestId")).toBe(AUTHORIZATION.requestId);
});

test("取得できていない接続の件数をボードの連携ボタンから確認できる", async () => {
  syncState.failed = true;
  const view = await renderBoard("/board?tab=schedule");
  expect(
    await view.findByRole("button", { name: /Google カレンダー連携.*未同期 1/ }),
  ).toBeDefined();
});
