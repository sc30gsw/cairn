import { Result } from "better-result";
import { afterEach, expect, test, vi } from "vite-plus/test";

import {
  defaultVisibleCalendarIds,
  deleteEvent,
  GoogleCalendarError,
  isAuthFailure,
  isGone,
  insertEvent,
  isRetryable,
  listCalendars,
  meetingUrlOf,
} from "./googleCalendar";

afterEach(() => {
  vi.unstubAllGlobals();
});

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

test("会議URLは hangoutLink を優先し、無ければ conferenceData の video entryPoint、どちらも無ければ undefined", () => {
  expect(meetingUrlOf({ id: "a", hangoutLink: "https://meet.google.com/abc-defg-hij" })).toBe(
    "https://meet.google.com/abc-defg-hij",
  );
  expect(
    meetingUrlOf({
      id: "b",
      conferenceData: {
        entryPoints: [
          { entryPointType: "phone", uri: "tel:+81-0000000000" },
          { entryPointType: "video", uri: "https://meet.google.com/xyz-uvwx-yz" },
        ],
      },
    }),
  ).toBe("https://meet.google.com/xyz-uvwx-yz");
  expect(meetingUrlOf({ id: "c" })).toBeUndefined();
});

test.each([200, 503])(
  "HTTP %s の本文受信失敗は診断情報付きの再試行可能なResultを返す",
  async (status) => {
    const cause = new TypeError("body connection reset");
    vi.stubGlobal(
      "fetch",
      async () =>
        new Response(new ReadableStream({ start: (controller) => controller.error(cause) }), {
          status,
        }),
    );

    const result = await listCalendars({ accessToken: "test-token" });

    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) {
      expect(result.error).toMatchObject({ cause, operation: "calendarList.list", status });
      expect(isRetryable(result.error)).toBe(true);
    }
  },
);

test("401本文の受信に失敗しても再認証の判定を保つ", async () => {
  vi.stubGlobal(
    "fetch",
    async () =>
      new Response(
        new ReadableStream({ start: (controller) => controller.error(new Error("reset")) }),
        {
          status: 401,
        },
      ),
  );

  const result = await listCalendars({ accessToken: "test-token" });

  expect(Result.isError(result)).toBe(true);
  if (Result.isError(result)) {
    expect(isAuthFailure(result.error)).toBe(true);
    expect(isRetryable(result.error)).toBe(false);
  }
});

test("204の削除成功では本文を読み取らない", async () => {
  const response = new Response(null, { status: 204 });
  const read = vi.spyOn(response, "text").mockRejectedValue(new Error("must not read"));
  vi.stubGlobal("fetch", async () => response);

  const result = await deleteEvent({ accessToken: "test-token" }, "calendar", "event");

  expect(Result.isOk(result)).toBe(true);
  expect(read).not.toHaveBeenCalled();
});

test("固定IDの再作成で409が返ると既存予定を回収して重複を防ぐ", async () => {
  const request = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ error: { message: "duplicate" } }), { status: 409 }),
    )
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ id: "cairn12345", updated: "2026-09-07T00:00:00Z" }), {
        status: 200,
      }),
    );
  vi.stubGlobal("fetch", request);
  const result = await insertEvent(
    { accessToken: "token" },
    "work@example.com",
    {
      description: "",
      start: { date: "2026-09-07" },
      end: { date: "2026-09-08" },
      summary: "期限",
      transparency: "transparent",
    },
    "cairn12345",
  );
  expect(Result.isOk(result) && result.value.id).toBe("cairn12345");
  expect(request).toHaveBeenCalledTimes(2);
  expect(request.mock.calls[0]?.[1]?.body).toContain('"id":"cairn12345"');
  expect(String(request.mock.calls[1]?.[0])).toContain("/events/cairn12345");
});
