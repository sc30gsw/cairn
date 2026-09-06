import { Result } from "better-result";
import { afterEach, expect, test, vi } from "vite-plus/test";

import { pullCalendar } from "./pullCalendar";
import { syncWindow } from "./window";

const client = { accessToken: "test-token" };
const calendarId = "owner@example.com";
const window = syncWindow("2026-08-17");

afterEach(() => vi.unstubAllGlobals());

function timedEvent(id: string, date = "2026-08-17") {
  return {
    end: { dateTime: `${date}T11:00:00+09:00` },
    id,
    start: { dateTime: `${date}T10:00:00+09:00` },
    status: "confirmed",
    summary: id,
    updated: "2026-08-17T00:00:00Z",
  };
}

test("410 後の全件同期は欠けた対応表を個別照会し、削除と期間外移動を区別する", async () => {
  const fetchedIds: string[] = [];
  vi.stubGlobal("fetch", (url: URL) => {
    if (url.searchParams.get("syncToken") === "expired") {
      return Promise.resolve(Response.json({ error: { message: "expired" } }, { status: 410 }));
    }
    if (url.pathname.endsWith("/events")) {
      return Promise.resolve(
        Response.json(
          url.searchParams.has("pageToken")
            ? { items: [{ id: "cancelled-in-list", status: "cancelled" }], nextSyncToken: "fresh" }
            : { items: [timedEvent("present")], nextPageToken: "page-2" },
        ),
      );
    }
    const eventId = url.pathname.split("/").at(-1) ?? "";
    fetchedIds.push(eventId);
    if (eventId === "gone") {
      return Promise.resolve(Response.json({ error: { message: "gone" } }, { status: 404 }));
    }
    return Promise.resolve(
      Response.json(
        eventId === "cancelled-in-get"
          ? { id: eventId, status: "cancelled" }
          : timedEvent(eventId, "2027-01-10"),
      ),
    );
  });

  const result = await pullCalendar(client, {
    calendarId,
    linkedEventIds: ["present", "gone", "moved", "cancelled-in-list", "cancelled-in-get", "gone"],
    syncToken: "expired",
    window,
  });

  expect(Result.isOk(result)).toBe(true);
  if (Result.isError(result)) {
    throw result.error;
  }
  expect(result.value.syncToken).toBe("fresh");
  expect(result.value.keepEventIds).toEqual(["present", "moved"]);
  expect(fetchedIds.toSorted()).toEqual(["cancelled-in-get", "gone", "moved"]);
  expect(result.value.events).toContainEqual({ calendarId, googleEventId: "gone", kind: "delete" });
  expect(result.value.events).toContainEqual({
    calendarId,
    googleEventId: "cancelled-in-get",
    kind: "delete",
  });
  expect(result.value.events.find((event) => event.googleEventId === "moved")).toMatchObject({
    kind: "upsert",
    startAt: "2027-01-10 10:00:00",
  });
});

test.each([403, 503])("個別照会の %i は削除扱いにせず、全件同期を失敗させる", async (status) => {
  vi.stubGlobal("fetch", (url: URL) =>
    Promise.resolve(
      url.pathname.endsWith("/events")
        ? Response.json({ items: [], nextSyncToken: "must-not-save" })
        : Response.json({ error: { message: "unavailable" } }, { status }),
    ),
  );
  const result = await pullCalendar(client, {
    calendarId,
    linkedEventIds: ["unavailable"],
    syncToken: null,
    window,
  });
  expect(Result.isError(result)).toBe(true);
  if (Result.isOk(result)) {
    throw new Error("expected failed reconciliation");
  }
  expect(result.error.status).toBe(status);
});

test("差分同期では今回変更されなかった対応表を再照会しない", async () => {
  const fetchMock = vi.fn(() =>
    Promise.resolve(Response.json({ items: [], nextSyncToken: "next" })),
  );
  vi.stubGlobal("fetch", fetchMock);

  const result = await pullCalendar(client, {
    calendarId,
    linkedEventIds: ["unchanged"],
    syncToken: "previous",
    window,
  });

  expect(result).toEqual(Result.ok({ events: [], keepEventIds: null, syncToken: "next" }));
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

test("個別照会の日時が解釈できなければ対応表を消さずに再同期を要求する", async () => {
  vi.stubGlobal("fetch", (url: URL) =>
    Promise.resolve(
      Response.json(
        url.pathname.endsWith("/events")
          ? { items: [], nextSyncToken: "must-not-save" }
          : { id: "invalid", status: "confirmed" },
      ),
    ),
  );

  const result = await pullCalendar(client, {
    calendarId,
    linkedEventIds: ["invalid"],
    syncToken: null,
    window,
  });

  expect(Result.isError(result)).toBe(true);
});
