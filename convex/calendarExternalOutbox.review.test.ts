import { Result } from "better-result";
import { convexTest } from "convex-test";
import { makeFunctionReference } from "convex/server";
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";

import { api, internal } from "./_generated/api";
import { GoogleAuthError } from "./lib/googleAccessToken";
import schema from "./schema";
import { applyPull } from "./services/calendarSync/applyPull";
import { clearConnection } from "./services/calendarSync/connection";

const tokenState = vi.hoisted(() => ({ fail: false }));

vi.mock("./lib/googleAccessToken", () => ({
  GoogleAuthError: class GoogleAuthError extends Error {},
  getGoogleAccessToken: async () =>
    tokenState.fail
      ? Result.err(new GoogleAuthError({ message: "expired" }))
      : Result.ok("test-token"),
}));

const modules = import.meta.glob([
  "./**/*.ts",
  "!./**/*.test.ts",
  "!./auth.config.ts",
  "!./auth.ts",
  "!./betterAuth/**",
  "!./convex.config.ts",
  "!./crons.ts",
  "!./http.ts",
  "!./migrations.ts",
]);

const OWNER = "owner";
const CALENDAR = "owner@example.com";
const TODAY = "2026-08-17";
const MOVED = { startAt: `${TODAY} 14:00:00`, endAt: `${TODAY} 15:00:00` };

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-08-17T03:00:00Z"));
  tokenState.fail = false;
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function setup() {
  const t = convexTest(schema, modules);
  const externalId = await t.run(async (ctx) => {
    await ctx.db.insert("calendarConnections", {
      calendars: [{ accessRole: "owner", id: CALENDAR, primary: true, summary: "予定" }],
      googleAccountId: "google-owner",
      ownerId: OWNER,
      primaryCalendarId: CALENDAR,
      status: "ok",
      visibleCalendarIds: [CALENDAR],
    });
    return ctx.db.insert("externalCalendarEvents", {
      allDay: false,
      calendarId: CALENDAR,
      googleEventId: "event",
      googleUpdated: "2026-08-17T00:00:00Z",
      ownerId: OWNER,
      startAt: `${TODAY} 10:00:00`,
      endAt: `${TODAY} 11:00:00`,
      title: "予定",
    });
  });
  return { externalId, owner: t.withIdentity({ subject: OWNER }), t };
}

async function pendingId(t: Awaited<ReturnType<typeof setup>>["t"]) {
  const pending = await t.run(async (ctx) => ctx.db.query("calendarExternalChanges").unique());
  if (pending === null) {
    throw new Error("pending change missing");
  }
  return pending._id;
}

function googleEvent() {
  return {
    id: "event",
    start: { dateTime: "2026-08-17T14:00:00+09:00" },
    end: { dateTime: "2026-08-17T15:00:00+09:00" },
    updated: "2026-08-17T03:01:00Z",
    summary: "予定",
  };
}

test("認証切れで残した変更は次の同期で pull より先に送信する", async () => {
  const { externalId, owner, t } = await setup();
  await owner.mutation(api.mutations.calendarSync.moveExternal.moveExternal, {
    externalId,
    ...MOVED,
  });
  const id = await pendingId(t);
  tokenState.fail = true;
  await t.action(internal.actions.calendarSync.pushExternal.pushExternal, {
    attempt: 0,
    pendingId: id,
  });
  expect(await pendingId(t)).toBe(id);
  expect(await t.run(async (ctx) => ctx.db.query("calendarConnections").unique())).toMatchObject({
    status: "needsReauth",
  });

  tokenState.fail = false;
  const methods: string[] = [];
  vi.stubGlobal("fetch", async (_url: URL, init: RequestInit) => {
    methods.push(init.method ?? "GET");
    return Response.json(
      init.method === "PATCH" ? googleEvent() : { items: [googleEvent()], nextSyncToken: "fresh" },
    );
  });
  expect(await owner.action(api.actions.calendarSync.syncNow.syncNow, {})).toBe("ok");
  expect(methods).toEqual(["PATCH", "GET"]);
  expect(await t.run(async (ctx) => ctx.db.query("calendarExternalChanges").collect())).toEqual([]);
  expect(
    await t.run(async (ctx) => ctx.db.get("externalCalendarEvents", externalId)),
  ).toMatchObject(MOVED);
});

test.each(["move", "delete"] as const)(
  "pending %s を pull と全件同期の掃除が巻き戻さない",
  async (kind) => {
    const { externalId, owner, t } = await setup();
    if (kind === "move") {
      await owner.mutation(api.mutations.calendarSync.moveExternal.moveExternal, {
        externalId,
        ...MOVED,
      });
    } else {
      await owner.mutation(api.mutations.calendarSync.removeExternal.removeExternal, {
        externalId,
      });
    }
    await t.run(async (ctx) =>
      applyPull(ctx, {
        calendarId: CALENDAR,
        events: [
          {
            allDay: false,
            calendarId: CALENDAR,
            googleEventId: "event",
            kind: "upsert",
            startAt: `${TODAY} 10:00:00`,
            endAt: `${TODAY} 11:00:00`,
            title: "古い予定",
            updated: "2026-08-17T02:00:00Z",
          },
        ],
        finish: { keepEventIds: [], syncToken: "stale" },
        ownerId: OWNER,
        todayJst: TODAY,
      }),
    );
    const events = await t.run(async (ctx) => ctx.db.query("externalCalendarEvents").collect());
    expect(events).toMatchObject(kind === "move" ? [MOVED] : []);
    expect(
      await t.run(async (ctx) => ctx.db.query("calendarExternalChanges").collect()),
    ).toHaveLength(1);
  },
);

test("送信中の新しい編集は古い送信の完了で消えず、古い再試行も送らない", async () => {
  const { externalId, owner, t } = await setup();
  await owner.mutation(api.mutations.calendarSync.moveExternal.moveExternal, {
    externalId,
    ...MOVED,
  });
  const firstId = await pendingId(t);
  let signalStarted = () => {};
  const started = new Promise<void>((resolve) => {
    signalStarted = resolve;
  });
  let resolveResponse: (response: Response) => void = () => {};
  const response = new Promise<Response>((resolve) => {
    resolveResponse = resolve;
  });
  const fetch = vi.fn(async () => {
    signalStarted();
    return (await response).clone();
  });
  vi.stubGlobal("fetch", fetch);
  const pushing = t.action(internal.actions.calendarSync.pushExternal.pushExternal, {
    attempt: 0,
    pendingId: firstId,
  });
  await started;
  const latest = { startAt: `${TODAY} 16:00:00`, endAt: `${TODAY} 17:00:00` };
  await owner.mutation(api.mutations.calendarSync.moveExternal.moveExternal, {
    externalId,
    ...latest,
  });
  const latestId = await pendingId(t);
  expect(latestId).not.toBe(firstId);
  resolveResponse(Response.json(googleEvent()));
  await pushing;
  expect(await pendingId(t)).toBe(latestId);
  await t.action(internal.actions.calendarSync.pushExternal.pushExternal, {
    attempt: 1,
    pendingId: firstId,
  });
  expect(fetch).toHaveBeenCalledTimes(1);
  await t.action(internal.actions.calendarSync.pushExternal.pushExternal, {
    attempt: 0,
    pendingId: latestId,
  });
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(await t.run(async (ctx) => ctx.db.query("calendarExternalChanges").collect())).toEqual([]);
  expect(
    await t.run(async (ctx) => ctx.db.get("externalCalendarEvents", externalId)),
  ).toMatchObject(latest);
});

test("切断は pending を掃除し、残った scheduled action は Google に送信しない", async () => {
  const { externalId, owner, t } = await setup();
  await owner.mutation(api.mutations.calendarSync.removeExternal.removeExternal, { externalId });
  const id = await pendingId(t);
  await t.run(async (ctx) => clearConnection(ctx, OWNER));
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  await t.action(internal.actions.calendarSync.pushExternal.pushExternal, {
    attempt: 0,
    pendingId: id,
  });
  expect(fetch).not.toHaveBeenCalled();
  expect(await t.run(async (ctx) => ctx.db.query("calendarExternalChanges").collect())).toEqual([]);
});

test("review: 再認証後の恒久エラーが後続 pending を永久に止める", async () => {
  const { externalId, owner, t } = await setup();
  await owner.mutation(api.mutations.calendarSync.moveExternal.moveExternal, {
    externalId,
    ...MOVED,
  });
  const secondId = await t.run(async (ctx) =>
    ctx.db.insert("externalCalendarEvents", {
      allDay: false,
      calendarId: CALENDAR,
      googleEventId: "later-event",
      googleUpdated: "2026-08-17T00:00:00Z",
      ownerId: OWNER,
      startAt: `${TODAY} 10:00:00`,
      endAt: `${TODAY} 11:00:00`,
      title: "後続",
    }),
  );
  await owner.mutation(api.mutations.calendarSync.moveExternal.moveExternal, {
    externalId: secondId,
    ...MOVED,
  });
  tokenState.fail = true;
  await t.finishAllScheduledFunctions(vi.runAllTimers);
  tokenState.fail = false;
  const patched: string[] = [];
  vi.stubGlobal("fetch", async (url: URL, init: RequestInit) => {
    if (init.method === "PATCH") {
      patched.push(url.pathname);
      if (url.pathname.endsWith("/event")) {
        return Response.json(
          { error: { message: "Forbidden", errors: [{ reason: "forbidden" }] } },
          { status: 403 },
        );
      }
      return Response.json({ ...googleEvent(), id: "later-event" });
    }
    return Response.json({ items: [], nextSyncToken: "fresh" });
  });
  await owner.action(api.actions.calendarSync.syncNow.syncNow, {});
  await owner.action(api.actions.calendarSync.syncNow.syncNow, {});
  expect(patched).toHaveLength(2);
  expect(patched.every((path) => path.endsWith("/event"))).toBe(true);
  expect(
    await t.run(async (ctx) => ctx.db.query("calendarExternalChanges").collect()),
  ).toHaveLength(2);
});

test("review: 旧予約引数は新しい action validator に拒否される", async () => {
  const { t } = await setup();
  const legacy = makeFunctionReference<"action">("actions/calendarSync/pushExternal:pushExternal");
  await expect(
    t.action(legacy, {
      attempt: 1,
      calendarId: CALENDAR,
      googleEventId: "event",
      ownerId: OWNER,
      change: { kind: "delete" },
    }),
  ).rejects.toThrow();
  expect(await t.run(async (ctx) => ctx.db.query("calendarExternalChanges").collect())).toEqual([]);
});
