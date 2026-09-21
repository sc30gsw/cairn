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
  PLAN_CALENDAR_SYNC_TOOLTIP,
  PlanCalendarSyncButton,
} from "~/features/plan/components/plan-calendar-sync-button";
import { PlanSearchSchema } from "~/features/plan/schemas/plan-search-schema";
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

async function renderPlan(initialEntry: string) {
  const root = createRootRoute();
  const plan = createRoute({
    component: PlanCalendarSyncButton,
    getParentRoute: () => root,
    path: "/plan",
    validateSearch: PlanSearchSchema,
  });
  const router = createRouter({
    history: createMemoryHistory({ initialEntries: [initialEntry] }),
    routeTree: root.addChildren([plan]),
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

test("計画では連携ボタンが常にあり、設定の開閉後も表示位置を保持する", async () => {
  const view = await renderPlan("/plan?week=2026-08-31");
  const button = view.getByRole("button", { name: "Google カレンダー連携" });
  act(() => button.focus());
  await waitFor(() => {
    expect(view.getByRole("tooltip", { hidden: true }).textContent).toBe(
      PLAN_CALENDAR_SYNC_TOOLTIP,
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
  expect(view.router.state.location.searchStr).toContain("week=2026-08-31");
});

test("Googleの同意後は計画で設定を開き、連携の仕上げを一度だけ実行する", async () => {
  window.history.replaceState(null, "", "/plan?calendarSync=true&week=2026-08-31");
  expect(Result.isOk(await linkGoogleCalendar(AUTHORIZATION))).toBe(true);
  const request = vi.mocked(authClient.linkSocial).mock.calls[0]?.[0];
  const callback = new URL(request?.callbackURL ?? "");
  expect(callback.pathname).toBe("/plan");
  expect(request?.errorCallbackURL).toBe(request?.callbackURL);

  window.history.replaceState(null, "", `${callback.pathname}${callback.search}`);
  const view = await renderPlan(`${callback.pathname}${callback.search}`);
  expect(
    await view.findByRole("dialog", { hidden: true, name: "Google カレンダー連携" }),
  ).toBeDefined();
  await waitFor(() => expect(connect).toHaveBeenCalledTimes(1));
  expect(readCalendarSyncConnectPending()).toBeNull();
});

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

test("取得できていない接続の件数を計画の連携ボタンから確認できる", async () => {
  syncState.failed = true;
  const view = await renderPlan("/plan");
  expect(
    await view.findByRole("button", { name: /Google カレンダー連携.*未同期 1/ }),
  ).toBeDefined();
});
