import { Result } from "better-result";
import { convexTest } from "convex-test";
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";

import { api, internal } from "./_generated/api";
import { listEvents } from "./lib/googleCalendar";
import schema from "./schema";

const tokenState = vi.hoisted(() => ({ failedAccount: "", revoked: true }));
vi.mock("./lib/googleAccessToken", () => ({
  getGoogleAccessToken: async (_ctx: unknown, args: { accountId: string }) =>
    args.accountId === tokenState.failedAccount
      ? Result.err({ message: "revoked", revoked: tokenState.revoked })
      : Result.ok(args.accountId),
}));
vi.mock("./lib/googleCalendar", async (original) => ({
  ...(await original<typeof import("./lib/googleCalendar")>()),
  listEvents: vi.fn(),
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
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-07T00:00:00Z"));
  tokenState.failedAccount = "";
  tokenState.revoked = true;
  vi.mocked(listEvents)
    .mockReset()
    .mockImplementation(async (client) =>
      Result.ok({
        nextSyncToken: `cursor-${client.accessToken}`,
        items: [
          {
            id: `event-${client.accessToken}`,
            summary: client.accessToken,
            start: { dateTime: "2026-09-07T01:00:00Z" },
            end: { dateTime: "2026-09-07T02:00:00Z" },
            updated: "2026-09-07T00:00:00Z",
          },
        ],
      }),
    );
});
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
});
async function setup() {
  const t = convexTest(schema, modules);
  const ids = await Promise.all(
    ["personal", "work", "third"].map((account) =>
      t.mutation(internal.mutations.calendarSync.upsertConnection.upsertConnection, {
        ownerId: "owner",
        googleAccountId: account,
        googleEmail: `${account}@example.com`,
        canWrite: false,
        calendars: [{ id: "shared", primary: true, summary: account, accessRole: "reader" }],
        defaultVisibleCalendarIds: ["shared"],
      }),
    ),
  );
  return { t, owner: t.withIdentity({ subject: "owner" }), ids };
}

test("一接続の失効でも他の二接続を同期し、失効接続の写しを保持する", async () => {
  const { t, owner, ids } = await setup();
  const work = ids[1];
  if (work === undefined) throw new Error("missing work connection");
  await t.mutation(internal.mutations.calendarSync.applyPull.applyPull, {
    ownerId: "owner",
    connectionId: work,
    calendarId: "shared",
    todayJst: "2026-09-07",
    finish: null,
    events: [
      {
        kind: "upsert",
        allDay: false,
        calendarId: "shared",
        googleEventId: "cached-work",
        title: "以前の会議",
        startAt: "2026-09-07 11:00:00",
        endAt: "2026-09-07 12:00:00",
        updated: "2026-09-06T00:00:00Z",
      },
    ],
  });
  tokenState.failedAccount = "work";
  expect(await owner.action(api.actions.calendarSync.syncNow.syncNow, {})).toBe("needsReauth");
  const status = await owner.query(api.queries.calendarSync.status.status, {});
  expect(status.connections.map((connection) => connection.status)).toEqual([
    "ok",
    "needsReauth",
    "ok",
  ]);
  const events = await owner.query(api.queries.calendarSync.listExternal.listExternal, {
    anchorDateJst: "2026-09-07",
    view: "day",
  });
  expect(events.map((event) => event.title).sort()).toEqual(["personal", "third", "以前の会議"]);
});

test("共有カレンダーでもカーソルを接続ごとに持ち、解除は一接続に限定する", async () => {
  const { t, owner, ids } = await setup();
  await owner.action(api.actions.calendarSync.syncNow.syncNow, {});
  const cursors = await t.run((ctx) => ctx.db.query("calendarSyncCursors").collect());
  expect(cursors).toHaveLength(3);
  expect(new Set(cursors.map((cursor) => cursor.connectionId)).size).toBe(3);
  const work = ids[1];
  if (work === undefined) throw new Error("missing work connection");
  tokenState.failedAccount = "work";
  expect(
    await owner.action(api.actions.calendarSync.disconnect.disconnect, { connectionId: work }),
  ).toEqual({ warning: null });
  expect(await t.run((ctx) => ctx.db.query("calendarSyncCursors").collect())).toHaveLength(2);
  expect(
    await owner.query(api.queries.calendarSync.listExternal.listExternal, {
      anchorDateJst: "2026-09-07",
      view: "day",
    }),
  ).toHaveLength(2);
});

test("100件を超える古い写しを分割削除し同じ共有カレンダーの別接続を保持する", async () => {
  const { t, owner, ids } = await setup();
  const first = ids[0];
  const work = ids[1];
  if (first === undefined || work === undefined) throw new Error("missing connections");
  await t.run(async (ctx) => {
    for (let index = 0; index < 205; index += 1)
      await ctx.db.insert("externalCalendarEvents", {
        ownerId: "owner",
        connectionId: first,
        calendarId: "shared",
        googleEventId: `old-${String(index)}`,
        title: "古い写し",
        allDay: false,
        startAt: "2026-09-07 10:00:00",
        endAt: "2026-09-07 11:00:00",
        googleUpdated: "2026-09-06T00:00:00Z",
      });
    await ctx.db.insert("externalCalendarEvents", {
      ownerId: "owner",
      connectionId: work,
      calendarId: "shared",
      googleEventId: "work-stays",
      title: "保持",
      allDay: false,
      startAt: "2026-09-07 10:00:00",
      endAt: "2026-09-07 11:00:00",
      googleUpdated: "2026-09-06T00:00:00Z",
    });
  });
  await owner.action(api.actions.calendarSync.syncNow.syncNow, { connectionId: first });
  const events = await t.run((ctx) => ctx.db.query("externalCalendarEvents").collect());
  expect(events.map((event) => event.googleEventId).sort()).toEqual([
    "event-personal",
    "work-stays",
  ]);
});

test("一時的なトークン更新障害は再認可にせず次の同期で復旧する", async () => {
  const { owner } = await setup();
  tokenState.failedAccount = "work";
  tokenState.revoked = false;
  expect(await owner.action(api.actions.calendarSync.syncNow.syncNow, {})).toBe("error");
  const failed = await owner.query(api.queries.calendarSync.status.status, {});
  expect(
    failed.connections.find((connection) => connection.googleAccountId === "work")?.status,
  ).toBe("error");
  tokenState.failedAccount = "";
  expect(await owner.action(api.actions.calendarSync.syncNow.syncNow, {})).toBe("ok");
  const recovered = await owner.query(api.queries.calendarSync.status.status, {});
  expect(recovered.connections.every((connection) => connection.status === "ok")).toBe(true);
});
