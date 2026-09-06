import { fireEvent, within } from "@testing-library/react";
import { Result } from "better-result";
import type { FunctionReturnType } from "convex/server";
import { beforeEach, expect, test, vi } from "vite-plus/test";

import type { api } from "~/../convex/_generated/api";
import {
  CALENDAR_SYNC_CALENDARS_LABEL,
  CALENDAR_SYNC_CONNECT_LABEL,
  CALENDAR_SYNC_DISCONNECT_LABEL,
  CALENDAR_SYNC_NEEDS_REAUTH_MESSAGE,
  CALENDAR_SYNC_NOW_LABEL,
  CALENDAR_SYNC_RECONNECT_LABEL,
  CalendarSyncSection,
} from "~/features/my-page/components/calendar-sync-section";
import { renderWithMantine } from "~/test-utils/render";

//? 型は Convex の status クエリから導く（手書きの複製を置かない）
type Status = NonNullable<FunctionReturnType<typeof api.queries.calendarSync.status.status>>;

const {
  connect,
  disconnect,
  linkGoogleCalendar,
  pendingState,
  runMutation,
  setVisible,
  syncNow,
  syncState,
} = vi.hoisted(() => ({
  connect: vi.fn().mockResolvedValue("ok"),
  disconnect: vi.fn().mockResolvedValue(null),
  linkGoogleCalendar: vi.fn(),
  pendingState: { pending: false },
  runMutation: vi.fn((operation: () => Promise<unknown>, _options: unknown) => operation()),
  setVisible: vi.fn().mockResolvedValue(null),
  syncNow: vi.fn().mockResolvedValue("ok"),
  syncState: { status: null as Status | null },
}));

vi.mock("~/hooks/use-calendar-sync", () => ({
  useCalendarSyncStatus: () => ({ data: syncState.status }),
  useConnectCalendarSync: () => connect,
  useDisconnectCalendarSync: () => disconnect,
  useSetVisibleCalendars: () => setVisible,
  useSyncCalendarNow: () => syncNow,
}));

vi.mock("~/features/my-page/lib/calendar-sync-actions", () => ({
  clearCalendarSyncConnectPending: () => {
    pendingState.pending = false;
  },
  linkGoogleCalendar,
  readCalendarSyncConnectPending: () => pendingState.pending,
  readCalendarSyncReturnError: () => null,
}));

vi.mock("~/lib/run-mutation", () => ({
  runMutation: (operation: () => Promise<unknown>, options: unknown) =>
    runMutation(operation, options),
}));

const CONNECTED: Status = {
  calendars: [
    {
      backgroundColor: "#9fe1cb",
      id: "owner@example.com",
      primary: true,
      summary: "owner@example.com",
    },
    {
      id: "ja.japanese#holiday@group.v.calendar.google.com",
      primary: false,
      summary: "日本の祝日",
    },
  ],
  googleEmail: "owner@example.com",
  lastError: null,
  lastSyncedAt: Date.UTC(2026, 8, 6, 3, 0, 0),
  status: "ok",
  visibleCalendarIds: ["owner@example.com"],
};

beforeEach(() => {
  syncState.status = null;
  pendingState.pending = false;
  connect.mockClear();
  disconnect.mockClear();
  linkGoogleCalendar.mockClear();
  runMutation.mockClear();
  setVisible.mockClear();
  syncNow.mockClear();
});

test("未接続なら連携ボタンだけがあり、押すと Google の同意画面へ向かう", async () => {
  linkGoogleCalendar.mockResolvedValue(Result.ok(undefined));
  const { getByRole, queryByText } = renderWithMantine(<CalendarSyncSection />);
  expect(queryByText(CALENDAR_SYNC_CALENDARS_LABEL)).toBeNull();

  getByRole("button", { name: CALENDAR_SYNC_CONNECT_LABEL }).click();

  await vi.waitFor(() => {
    expect(linkGoogleCalendar).toHaveBeenCalledTimes(1);
  });
});

test("同意画面から戻ってきたら connect アクションで接続を仕上げる", async () => {
  pendingState.pending = true;
  renderWithMantine(<CalendarSyncSection />);

  await vi.waitFor(() => {
    expect(connect).toHaveBeenCalledWith({});
  });
  expect(runMutation).toHaveBeenCalledWith(expect.any(Function), {
    successMessage: expect.any(Function),
  });
  expect(pendingState.pending).toBe(false);
});

test("接続済みならアカウント・カレンダーの選択・今すぐ同期・解除が出る", async () => {
  syncState.status = CONNECTED;
  const { getAllByText, getByLabelText, getByRole, getByText } = renderWithMantine(
    <CalendarSyncSection />,
  );

  expect(getByText(/接続中の Google アカウント/)).toBeDefined();
  expect(getAllByText("owner@example.com").length).toBeGreaterThan(0);
  expect(getByText(CALENDAR_SYNC_CALENDARS_LABEL)).toBeDefined();
  const holiday = getByLabelText(/日本の祝日/) as HTMLInputElement;
  expect(holiday.checked).toBe(false);
  expect(getByRole("button", { name: CALENDAR_SYNC_DISCONNECT_LABEL })).toBeDefined();

  //? 同期中（busy）はチェックボックスが無効になるので、先にカレンダーを選び直す
  fireEvent.click(holiday);
  await vi.waitFor(() => {
    expect(setVisible).toHaveBeenCalledWith({
      calendarIds: ["owner@example.com", "ja.japanese#holiday@group.v.calendar.google.com"],
    });
  });

  getByRole("button", { name: CALENDAR_SYNC_NOW_LABEL }).click();
  await vi.waitFor(() => {
    expect(syncNow).toHaveBeenCalledWith({});
  });
});

test("権限切れなら再接続ボタンと案内が出て、今すぐ同期は出ない", () => {
  syncState.status = { ...CONNECTED, status: "needsReauth" };
  const { getByRole, getByText, queryByRole } = renderWithMantine(<CalendarSyncSection />);

  expect(getByText(CALENDAR_SYNC_NEEDS_REAUTH_MESSAGE)).toBeDefined();
  expect(getByRole("button", { name: CALENDAR_SYNC_RECONNECT_LABEL })).toBeDefined();
  expect(queryByRole("button", { name: CALENDAR_SYNC_NOW_LABEL })).toBeNull();
});

test("同期に失敗しているときは lastError の文言が見える", () => {
  syncState.status = { ...CONNECTED, lastError: "Rate Limit Exceeded", status: "error" };
  const { getByText } = renderWithMantine(<CalendarSyncSection />);
  expect(getByText("Rate Limit Exceeded")).toBeDefined();
  expect(getByText("同期に失敗")).toBeDefined();
});

test("権限切れのときはカレンダーの選択を変えられない", () => {
  syncState.status = { ...CONNECTED, status: "needsReauth" };
  const { getByLabelText } = renderWithMantine(<CalendarSyncSection />);
  const holiday = getByLabelText(/日本の祝日/) as HTMLInputElement;
  expect(holiday.disabled).toBe(true);
});

test("解除は確認を挟み、確定したときだけ disconnect が呼ばれる", async () => {
  syncState.status = CONNECTED;
  const { getAllByRole, getByRole } = renderWithMantine(<CalendarSyncSection />);
  //? 確認ダイアログの確定ボタンは元のボタンと同じ名前なので、探す範囲をダイアログ内に限る
  const trigger = () =>
    getAllByRole("button", { name: CALENDAR_SYNC_DISCONNECT_LABEL })[0] as HTMLElement;

  fireEvent.click(trigger());
  const first = await vi.waitFor(() => getByRole("dialog", { hidden: true }));
  fireEvent.click(within(first).getByRole("button", { hidden: true, name: "キャンセル" }));
  expect(disconnect).not.toHaveBeenCalled();

  fireEvent.click(trigger());
  const second = await vi.waitFor(() => getByRole("dialog", { hidden: true }));
  fireEvent.click(
    within(second).getByRole("button", { hidden: true, name: CALENDAR_SYNC_DISCONNECT_LABEL }),
  );
  await vi.waitFor(() => {
    expect(disconnect).toHaveBeenCalledWith({});
  });
});
