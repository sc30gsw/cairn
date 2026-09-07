import { fireEvent, within } from "@testing-library/react";
import { Result } from "better-result";
import { beforeEach, expect, test, vi } from "vite-plus/test";
import { CALENDAR_SYNC_NEEDS_REAUTH_MESSAGE } from "~domain/calendarSync";

import type { Id } from "~/../convex/_generated/dataModel";
import { CalendarSyncSection } from "~/components/calendar-sync-section";
import {
  CALENDAR_SYNC_CONNECT_LABEL,
  CALENDAR_SYNC_DISCONNECT_LABEL,
  CALENDAR_SYNC_NOW_LABEL,
  CALENDAR_SYNC_RECONNECT_LABEL,
} from "~/lib/calendar-sync-labels";
import type { CalendarConnection, CalendarSyncSettings } from "~/lib/calendar-sync-types";
import { MutationFailedError } from "~/lib/errors";
import { renderWithMantine } from "~/test-utils/render";

const {
  begin,
  connect,
  disconnect,
  linkGoogleCalendar,
  pendingState,
  runMutation,
  retryOutput,
  setOutput,
  setVisible,
  syncNow,
  syncState,
} = vi.hoisted(() => ({
  begin: vi.fn(),
  connect: vi.fn().mockResolvedValue("ok"),
  disconnect: vi.fn().mockResolvedValue({ warning: null }),
  linkGoogleCalendar: vi.fn(),
  pendingState: { requestId: null as string | null, error: null as string | null },
  runMutation: vi.fn<(operation: () => Promise<unknown>, options?: unknown) => Promise<unknown>>(),
  retryOutput: vi.fn().mockResolvedValue("ok"),
  setOutput: vi.fn().mockResolvedValue(null),
  setVisible: vi.fn().mockResolvedValue(null),
  syncNow: vi.fn().mockResolvedValue("ok"),
  syncState: {
    status: { connections: [], output: null, outputChanging: false } as CalendarSyncSettings,
  },
}));

vi.mock("~/hooks/use-calendar-sync", () => ({
  useBeginCalendarAuthorization: () => begin,
  useCalendarSyncStatus: () => ({ data: syncState.status }),
  useConnectCalendarSync: () => connect,
  useDisconnectCalendarSync: () => disconnect,
  useRetryCalendarOutput: () => retryOutput,
  useSetCalendarOutput: () => setOutput,
  useSetVisibleCalendars: () => setVisible,
  useSyncCalendarNow: () => syncNow,
}));
vi.mock("~/lib/calendar-sync-actions", () => ({
  clearCalendarSyncConnectPending: () => {
    pendingState.requestId = null;
  },
  linkGoogleCalendar,
  readCalendarSyncConnectPending: () => pendingState.requestId,
  readCalendarSyncReturnError: () => pendingState.error,
}));
vi.mock("~/lib/run-mutation", () => ({
  runMutation: (operation: () => Promise<unknown>, options: unknown) =>
    runMutation(operation, options),
}));
vi.mock("~/lib/notify", () => ({ notifyError: vi.fn() }));

const PERSONAL: CalendarConnection = {
  connectionId: "personal-connection" as Id<"calendarConnections">,
  googleAccountId: "personal-google",
  externalReadOnly: false,
  canWrite: true,
  calendars: [
    { id: "owner@example.com", summary: "個人の予定", primary: true, accessRole: "owner" },
    { id: "holidays", summary: "日本の祝日", primary: false, accessRole: "reader" },
  ],
  googleEmail: "owner@example.com",
  lastError: null,
  lastSyncedAt: Date.UTC(2026, 8, 6, 3),
  status: "ok",
  visibleCalendarIds: ["owner@example.com"],
};
const WORK: CalendarConnection = {
  ...PERSONAL,
  connectionId: "work-connection" as Id<"calendarConnections">,
  googleAccountId: "work-google",
  googleEmail: "work@example.com",
  externalReadOnly: true,
  canWrite: false,
  calendars: [
    { id: "work@example.com", summary: "仕事の会議", primary: true, accessRole: "owner" },
  ],
  visibleCalendarIds: ["work@example.com"],
};
const CONNECTED: CalendarSyncSettings = {
  connections: [PERSONAL, WORK],
  output: { connectionId: PERSONAL.connectionId, calendarId: "owner@example.com" },
  outputChanging: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  syncState.status = { connections: [], output: null, outputChanging: false };
  pendingState.requestId = null;
  pendingState.error = null;
  begin.mockResolvedValue({ requestId: "authorization-1", scopes: ["calendar.readonly"] });
  linkGoogleCalendar.mockResolvedValue(Result.ok(undefined));
  runMutation.mockImplementation(async (operation) => Result.ok(await operation()));
});

test("未接続なら閲覧用の要求を作成して Google の同意画面へ向かう", async () => {
  const { getByRole } = renderWithMantine(<CalendarSyncSection />);
  fireEvent.click(getByRole("button", { name: CALENDAR_SYNC_CONNECT_LABEL }));
  await vi.waitFor(() => expect(begin).toHaveBeenCalledWith({ purpose: "read" }));
  await vi.waitFor(() =>
    expect(linkGoogleCalendar).toHaveBeenCalledWith({
      requestId: "authorization-1",
      scopes: ["calendar.readonly"],
    }),
  );
});

test("接続要求の作成に失敗したら Google の同意画面へ進まない", async () => {
  runMutation.mockResolvedValue(
    Result.err(new MutationFailedError({ message: "接続できません", cause: new Error("offline") })),
  );
  const { getByRole } = renderWithMantine(<CalendarSyncSection />);
  fireEvent.click(getByRole("button", { name: CALENDAR_SYNC_CONNECT_LABEL }));
  await vi.waitFor(() => expect(runMutation).toHaveBeenCalled());
  expect(linkGoogleCalendar).not.toHaveBeenCalled();
});

test("同意画面から戻ると要求 ID を渡して接続を一度だけ仕上げる", async () => {
  pendingState.requestId = "authorization-1";
  const view = renderWithMantine(<CalendarSyncSection />);
  await vi.waitFor(() => expect(connect).toHaveBeenCalledWith({ requestId: "authorization-1" }));
  view.rerender(<CalendarSyncSection />);
  expect(connect).toHaveBeenCalledTimes(1);
  await vi.waitFor(() => expect(pendingState.requestId).toBeNull());
});

test("Google でキャンセルした場合は接続を作らない", () => {
  pendingState.requestId = "authorization-1";
  pendingState.error = "access_denied";
  renderWithMantine(<CalendarSyncSection />);
  expect(connect).not.toHaveBeenCalled();
  expect(pendingState.requestId).toBeNull();
});

test("同期中で接続を待つ場合は要求を保持し、同じアカウントの接続を再試行できる", async () => {
  pendingState.requestId = "authorization-1";
  connect.mockResolvedValueOnce("busy");
  const { findByRole } = renderWithMantine(<CalendarSyncSection />);
  const retry = await findByRole("button", { name: "接続を完了する" });
  expect(pendingState.requestId).toBe("authorization-1");
  fireEvent.click(retry);
  await vi.waitFor(() => expect(connect).toHaveBeenCalledTimes(2));
  expect(connect).toHaveBeenLastCalledWith({ requestId: "authorization-1" });
  await vi.waitFor(() => expect(pendingState.requestId).toBeNull());
});

test("複数アカウントの表示カレンダーと手動同期は選んだ接続だけに適用する", async () => {
  syncState.status = CONNECTED;
  const { getByRole, getByText } = renderWithMantine(<CalendarSyncSection />);
  const personal = getByRole("group", { name: "owner@example.com" });
  const work = getByRole("group", { name: "work@example.com" });
  expect(within(work).getByText("外部予定は閲覧専用")).toBeDefined();
  expect(getByRole("button", { name: "Google アカウントを追加" })).toBeDefined();
  expect(getByText(/毎日 2:00・14:00/)).toBeDefined();
  fireEvent.click(within(personal).getByRole("checkbox", { name: "日本の祝日" }));
  await vi.waitFor(() =>
    expect(setVisible).toHaveBeenCalledWith({
      connectionId: PERSONAL.connectionId,
      calendarIds: ["owner@example.com", "holidays"],
    }),
  );
  fireEvent.click(within(work).getByRole("button", { name: CALENDAR_SYNC_NOW_LABEL }));
  await vi.waitFor(() => expect(syncNow).toHaveBeenCalledWith({ connectionId: WORK.connectionId }));
});

test("1アカウントの権限切れでも他のアカウントは同期でき、対象を指定して再接続する", async () => {
  syncState.status = { ...CONNECTED, connections: [PERSONAL, { ...WORK, status: "needsReauth" }] };
  const { getByRole, getByText } = renderWithMantine(<CalendarSyncSection />);
  const work = getByRole("group", { name: "work@example.com" });
  expect(getByText(new RegExp(CALENDAR_SYNC_NEEDS_REAUTH_MESSAGE))).toBeDefined();
  expect(within(work).getByRole("checkbox", { name: "仕事の会議" }).hasAttribute("disabled")).toBe(
    true,
  );
  expect(
    within(getByRole("group", { name: "owner@example.com" }))
      .getByRole("button", { name: CALENDAR_SYNC_NOW_LABEL })
      .hasAttribute("disabled"),
  ).toBe(false);
  fireEvent.click(within(work).getByRole("button", { name: CALENDAR_SYNC_RECONNECT_LABEL }));
  await vi.waitFor(() =>
    expect(begin).toHaveBeenCalledWith({ googleAccountId: WORK.googleAccountId, purpose: "read" }),
  );
});

test("仕事用への保存には選択したカレンダーの追加権限を求め、元の保存先は先に変更しない", async () => {
  syncState.status = CONNECTED;
  const { getByRole } = renderWithMantine(<CalendarSyncSection />);
  fireEvent.click(getByRole("combobox", { name: "Cairn の予定の保存先" }));
  fireEvent.click(getByRole("option", { name: "仕事の会議" }));
  fireEvent.click(getByRole("button", { name: "保存先を変更" }));
  await vi.waitFor(() =>
    expect(begin).toHaveBeenCalledWith({
      googleAccountId: WORK.googleAccountId,
      purpose: "write",
      calendarId: "work@example.com",
    }),
  );
  expect(setOutput).not.toHaveBeenCalled();
});

test("書き込み権限のある接続を選べば、選んだ1カレンダーを保存先にする", async () => {
  syncState.status = { ...CONNECTED, connections: [PERSONAL, { ...WORK, canWrite: true }] };
  const { getByRole } = renderWithMantine(<CalendarSyncSection />);
  fireEvent.click(getByRole("combobox", { name: "Cairn の予定の保存先" }));
  fireEvent.click(getByRole("option", { name: "仕事の会議" }));
  fireEvent.click(getByRole("button", { name: "保存先を変更" }));
  await vi.waitFor(() =>
    expect(setOutput).toHaveBeenCalledWith({
      connectionId: WORK.connectionId,
      calendarId: "work@example.com",
    }),
  );
  expect(begin).not.toHaveBeenCalled();
});

test("解除はアカウントごとに確認し、キャンセルでは変更しない", async () => {
  syncState.status = CONNECTED;
  const { getByRole } = renderWithMantine(<CalendarSyncSection />);
  const trigger = within(getByRole("group", { name: "work@example.com" })).getByRole("button", {
    name: CALENDAR_SYNC_DISCONNECT_LABEL,
  });
  fireEvent.click(trigger);
  const first = await vi.waitFor(() => getByRole("dialog", { hidden: true }));
  expect(
    within(first).getByText(/Google 上の予定と、ほかのアカウントの連携は残ります/),
  ).toBeDefined();
  fireEvent.click(within(first).getByRole("button", { hidden: true, name: "キャンセル" }));
  expect(disconnect).not.toHaveBeenCalled();
  fireEvent.click(trigger);
  const second = await vi.waitFor(() => getByRole("dialog", { hidden: true }));
  fireEvent.click(
    within(second).getByRole("button", { hidden: true, name: CALENDAR_SYNC_DISCONNECT_LABEL }),
  );
  await vi.waitFor(() =>
    expect(disconnect).toHaveBeenCalledWith({ connectionId: WORK.connectionId }),
  );
});

test("保存先の移動中も移動を再開する操作があり、新しい保存先の選択は待つ", async () => {
  syncState.status = { ...CONNECTED, outputChanging: true };
  const { getByRole } = renderWithMantine(<CalendarSyncSection />);
  expect(getByRole("combobox", { name: "Cairn の予定の保存先" }).hasAttribute("disabled")).toBe(
    true,
  );
  const resume = getByRole("button", { name: "移動を再開" });
  expect(resume.hasAttribute("disabled")).toBe(false);
  fireEvent.click(resume);
  await vi.waitFor(() => expect(retryOutput).toHaveBeenCalledWith({}));
});

test("保存先の移動中に権限が切れた接続を、保存先を変えずに再認可できる", async () => {
  syncState.status = {
    ...CONNECTED,
    connections: [PERSONAL, { ...WORK, canWrite: true, status: "needsReauth" }],
    outputChanging: true,
  };
  const { getByRole } = renderWithMantine(<CalendarSyncSection />);
  const work = within(getByRole("group", { name: "work@example.com" }));
  const reconnect = work.getByRole("button", { name: CALENDAR_SYNC_RECONNECT_LABEL });
  expect(reconnect.hasAttribute("disabled")).toBe(false);
  expect(
    work.getByRole("button", { name: CALENDAR_SYNC_DISCONNECT_LABEL }).hasAttribute("disabled"),
  ).toBe(true);
  expect(getByRole("button", { name: "Google アカウントを追加" }).hasAttribute("disabled")).toBe(
    true,
  );
  fireEvent.click(reconnect);
  await vi.waitFor(() =>
    expect(begin).toHaveBeenCalledWith({
      googleAccountId: WORK.googleAccountId,
      purpose: "write",
    }),
  );
  expect(setOutput).not.toHaveBeenCalled();
});
