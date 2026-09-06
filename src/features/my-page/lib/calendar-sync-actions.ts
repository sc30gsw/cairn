import { Result } from "better-result";
import { GOOGLE_CALENDAR_SCOPES } from "~domain/calendarSync";

import { type AuthActionResult, runAuthAction } from "~/lib/auth-action-result";
import { authClient } from "~/lib/auth-client";
import { authActionError } from "~/lib/run-auth-action";
import {
  trySessionStorageGet,
  trySessionStorageRemove,
  trySessionStorageSet,
} from "~/lib/safe-storage";

const CALENDAR_SYNC_CONNECT_PENDING_KEY = "cairn:calendar-sync:connect-pending";

export function readCalendarSyncConnectPending(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return trySessionStorageGet(CALENDAR_SYNC_CONNECT_PENDING_KEY) === "1";
}

export function clearCalendarSyncConnectPending(): void {
  if (typeof window === "undefined") {
    return;
  }
  trySessionStorageRemove(CALENDAR_SYNC_CONNECT_PENDING_KEY);
}

export function readCalendarSyncReturnError(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return new URLSearchParams(window.location.search).get("error");
}

function myPageUrl(): string {
  return `${window.location.origin}/my-page`;
}

export async function linkGoogleCalendar(): Promise<AuthActionResult> {
  trySessionStorageSet(CALENDAR_SYNC_CONNECT_PENDING_KEY, "1");
  const result = await runAuthAction(async () => {
    const authResult = await authClient.linkSocial({
      callbackURL: myPageUrl(),
      errorCallbackURL: myPageUrl(),
      provider: "google",
      scopes: [...GOOGLE_CALENDAR_SCOPES],
    });
    if (authResult.error) {
      throw authActionError(authResult.error, "linkGoogleCalendar");
    }
  }, "linkGoogleCalendar");
  if (Result.isError(result)) {
    clearCalendarSyncConnectPending();
  }
  return result;
}
