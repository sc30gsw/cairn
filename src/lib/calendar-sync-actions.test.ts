import { Result } from "better-result";
import type { FunctionReturnType } from "convex/server";
import { beforeEach, expect, test, vi } from "vite-plus/test";

import type { api } from "~/../convex/_generated/api";
import { authClient } from "~/lib/auth-client";
import {
  clearCalendarSyncConnectPending,
  linkGoogleCalendar,
  readCalendarSyncConnectPending,
} from "~/lib/calendar-sync-actions";

vi.mock("~/lib/auth-client", () => ({ authClient: { linkSocial: vi.fn() } }));

type Authorization = FunctionReturnType<typeof api.mutations.calendarAuth.begin.begin>;
function authorization(requestId: string): Authorization {
  return {
    requestId: requestId as Authorization["requestId"],
    scopes: ["calendar.events.readonly"],
  };
}

beforeEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.clearAllMocks();
  sessionStorage.clear();
  window.history.replaceState(
    null,
    "",
    "/board?tab=schedule&view=month&date=2026-09-07&calendarSync=true",
  );
  vi.mocked(authClient.linkSocial).mockResolvedValue({ data: null, error: null });
});

test("OAuth要求と復帰URLに同じ要求IDを渡し、表示位置を保持する", async () => {
  expect(Result.isOk(await linkGoogleCalendar(authorization("request-a")))).toBe(true);
  const input = vi.mocked(authClient.linkSocial).mock.calls[0]?.[0];
  expect(input?.additionalData).toEqual({ calendarRequestId: "request-a" });
  expect(input?.scopes).toEqual(["calendar.events.readonly"]);
  const callback = new URL(input?.callbackURL ?? "");
  expect(callback.searchParams.get("view")).toBe("month");
  expect(callback.searchParams.get("date")).toBe("2026-09-07");
  expect(readCalendarSyncConnectPending()).toBeNull();
  window.history.replaceState(null, "", `${callback.pathname}${callback.search}`);
  expect(readCalendarSyncConnectPending()).toBe("request-a");
});

test("別要求を開始しても、復帰URLが指す要求だけを仕上げて消去する", async () => {
  await linkGoogleCalendar(authorization("request-a"));
  await linkGoogleCalendar(authorization("request-b"));
  window.history.replaceState(null, "", "/board?calendarRequestId=request-a");
  expect(readCalendarSyncConnectPending()).toBe("request-a");
  clearCalendarSyncConnectPending();
  expect(readCalendarSyncConnectPending()).toBeNull();
  window.history.replaceState(null, "", "/board?calendarRequestId=request-b");
  expect(readCalendarSyncConnectPending()).toBe("request-b");
});

test("このタブで開始していない要求IDは自動処理しない", () => {
  window.history.replaceState(null, "", "/board?calendarRequestId=unrecognized");
  expect(readCalendarSyncConnectPending()).toBeNull();
});

test("認可開始の失敗はResultで返し、その要求の復帰印を取り除く", async () => {
  vi.mocked(authClient.linkSocial).mockRejectedValue(new Error("offline"));
  const result = await linkGoogleCalendar(authorization("request-a"));
  expect(Result.isError(result)).toBe(true);
  window.history.replaceState(null, "", "/board?calendarRequestId=request-a");
  expect(readCalendarSyncConnectPending()).toBeNull();
});

test("復帰情報を保存できない場合は同意画面を開かず、回復可能なエラーを返す", async () => {
  vi.stubGlobal("sessionStorage", {
    getItem: () => null,
    removeItem: () => undefined,
    setItem: () => {
      throw new Error("blocked");
    },
  });
  const result = await linkGoogleCalendar(authorization("request-a"));
  expect(Result.isError(result)).toBe(true);
  expect(authClient.linkSocial).not.toHaveBeenCalled();
});
