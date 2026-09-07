import { Result } from "better-result";
import type { FunctionReturnType } from "convex/server";
import { CALENDAR_REQUEST_ID_KEY } from "~domain/calendarSync";

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

function pendingKey(requestId: string): string {
  return `${CALENDAR_SYNC_CONNECT_PENDING_KEY}:${requestId}`;
}

export function readCalendarSyncConnectPending(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  const requestId = new URLSearchParams(window.location.search).get(CALENDAR_REQUEST_ID_KEY);
  return requestId && trySessionStorageGet(pendingKey(requestId)) === "1" ? requestId : null;
}

export function clearCalendarSyncConnectPending(
  requestId = readCalendarSyncConnectPending(),
): void {
  if (typeof window === "undefined") {
    return;
  }
  if (requestId !== null) trySessionStorageRemove(pendingKey(requestId));
}

export function readCalendarSyncReturnError(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return new URLSearchParams(window.location.search).get("error");
}

function calendarSyncUrl(requestId: string): string {
  const url = new URL(window.location.href);
  url.searchParams.delete("error");
  url.searchParams.delete("error_description");
  url.searchParams.set(CALENDAR_REQUEST_ID_KEY, requestId);
  return url.toString();
}

export async function linkGoogleCalendar({
  requestId,
  scopes,
}: CalendarAuthorization): Promise<AuthActionResult> {
  trySessionStorageSet(pendingKey(requestId), "1");
  const result = await runAuthAction(async () => {
    if (trySessionStorageGet(pendingKey(requestId)) !== "1") {
      throw new AuthActionError({
        cause: new Error("Calendar authorization request could not be stored"),
        message:
          "接続情報をブラウザーに保存できません。ストレージの設定を確認して、もう一度接続してください。",
      });
    }
    const authResult = await authClient.linkSocial({
      callbackURL: calendarSyncUrl(requestId),
      errorCallbackURL: calendarSyncUrl(requestId),
      additionalData: { [CALENDAR_REQUEST_ID_KEY]: requestId },
      provider: "google",
      scopes,
    });
    if (authResult.error) {
      throw authActionError(authResult.error, "linkGoogleCalendar");
    }
  }, "linkGoogleCalendar");
  if (Result.isError(result)) {
    trySessionStorageRemove(pendingKey(requestId));
  }
  return result;
}
