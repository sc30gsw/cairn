import { expect, test } from "vite-plus/test";

import {
  defaultVisibleCalendarIds,
  GoogleCalendarError,
  isAuthFailure,
  isGone,
  isRetryable,
} from "./googleCalendar";

function error(status: number | null, reason: string | null = null) {
  return new GoogleCalendarError({ message: "x", operation: "events.list", reason, status });
}

test("401 と権限系の 403 だけが再接続、レート制限の 403 は再試行", () => {
  expect(isAuthFailure(error(401))).toBe(true);
  expect(isAuthFailure(error(403, "insufficientPermissions"))).toBe(true);
  expect(isAuthFailure(error(403))).toBe(false);
  expect(isRetryable(error(403))).toBe(false);
  expect(isAuthFailure(error(403, "rateLimitExceeded"))).toBe(false);
  expect(isRetryable(error(403, "userRateLimitExceeded"))).toBe(true);
  expect(isRetryable(error(429))).toBe(true);
  expect(isRetryable(error(503))).toBe(true);
  expect(isRetryable(error(null))).toBe(true);
  expect(isRetryable(error(400))).toBe(false);
});

test("404 / 410 は「もう無い」", () => {
  expect(isGone(error(404))).toBe(true);
  expect(isGone(error(410))).toBe(true);
  expect(isGone(error(403))).toBe(false);
});

test("表示カレンダーの既定は Google 側で表示中のものだけで、空き情報だけ見える共有は除く", () => {
  expect(
    defaultVisibleCalendarIds([
      { accessRole: "owner", id: "mine" },
      { accessRole: "reader", id: "team", selected: true },
      { accessRole: "reader", id: "hidden", selected: false },
      { accessRole: "freeBusyReader", id: "busy-only", selected: true },
    ]),
  ).toEqual(["mine", "team"]);
});
