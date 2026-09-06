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

//? 連携は「Google の同意画面 → /my-page に戻る → connect アクション」の2段。戻ってきたことを
//? sessionStorage の印で知る（URL を汚さない。passkey の OAuth 待ちと同じ形）
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

//? Google の同意画面で拒否・失敗すると Better Auth は ?error=... を付けて errorCallbackURL へ戻す
export function readCalendarSyncReturnError(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return new URLSearchParams(window.location.search).get("error");
}

function myPageUrl(): string {
  return `${window.location.origin}/my-page`;
}

//? Better Auth の linkSocial に Calendar のスコープを足して求める（段階的認可、ADR-0016）。
//? 同じ Google アカウントなら既存の連携行のスコープが更新され、別アカウントでも連携できる
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
