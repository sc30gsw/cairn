import { Result } from "better-result";
import type { FunctionReturnType } from "convex/server";

import type { api } from "~/../convex/_generated/api";
import { type AuthActionResult, runAuthAction } from "~/lib/auth-action-result";
import { authClient } from "~/lib/auth-client";
import { AuthActionError } from "~/lib/errors";
import { authActionError } from "~/lib/run-auth-action";
import {
  trySessionStorageGet,
  trySessionStorageRemove,
  trySessionStorageSet,
} from "~/lib/safe-storage";

const CALENDAR_SYNC_CONNECT_PENDING_KEY = "cairn:calendar-sync:connect-pending";
type CalendarAuthorization = FunctionReturnType<typeof api.mutations.calendarAuth.begin.begin>;

export function readCalendarSyncConnectPending(): CalendarAuthorization["requestId"] | null {
  if (typeof window === "undefined") {
    return null;
  }
  const requestId = new URLSearchParams(window.location.search).get("calendarRequestId");
  if (
    !requestId ||
    trySessionStorageGet(`${CALENDAR_SYNC_CONNECT_PENDING_KEY}:${requestId}`) !== "1"
  ) {
    return null;
  }
  return requestId as CalendarAuthorization["requestId"];
}

export function clearCalendarSyncConnectPending(
  requestId = readCalendarSyncConnectPending(),
): void {
  if (typeof window === "undefined") {
    return;
  }
  if (requestId !== null)
    trySessionStorageRemove(`${CALENDAR_SYNC_CONNECT_PENDING_KEY}:${requestId}`);
}

export function readCalendarSyncReturnError(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return new URLSearchParams(window.location.search).get("error");
}

function calendarSyncUrl(requestId: CalendarAuthorization["requestId"]): string {
  const url = new URL(window.location.href);
  url.searchParams.delete("error");
  url.searchParams.delete("error_description");
  url.searchParams.set("calendarRequestId", requestId);
  return url.toString();
}

export async function linkGoogleCalendar({
  requestId,
  scopes,
}: CalendarAuthorization): Promise<AuthActionResult> {
  trySessionStorageSet(`${CALENDAR_SYNC_CONNECT_PENDING_KEY}:${requestId}`, "1");
  const result = await runAuthAction(async () => {
    if (trySessionStorageGet(`${CALENDAR_SYNC_CONNECT_PENDING_KEY}:${requestId}`) !== "1") {
      throw new AuthActionError({
        cause: new Error("Calendar authorization request could not be stored"),
        message:
          "接続情報をブラウザーに保存できません。ストレージの設定を確認して、もう一度接続してください。",
      });
    }
    const authResult = await authClient.linkSocial({
      callbackURL: calendarSyncUrl(requestId),
      errorCallbackURL: calendarSyncUrl(requestId),
      additionalData: { calendarRequestId: requestId },
      provider: "google",
      scopes,
    });
    if (authResult.error) {
      throw authActionError(authResult.error, "linkGoogleCalendar");
    }
  }, "linkGoogleCalendar");
  if (Result.isError(result)) {
    trySessionStorageRemove(`${CALENDAR_SYNC_CONNECT_PENDING_KEY}:${requestId}`);
  }
  return result;
}
