import { Result } from "better-result";
import { convexTest } from "convex-test";
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";

import { api, internal } from "./_generated/api";
import { GoogleAuthError } from "./lib/googleAccessToken";
import type { ExternalChange } from "./lib/validators";
import schema from "./schema";
import { applyPull } from "./services/calendarSync/applyPull";
import { clearConnection, upsertConnection } from "./services/calendarSync/connection";

const tokenState = vi.hoisted(() => ({ fail: false }));

vi.mock("./lib/googleAccessToken", () => ({
  GoogleAuthError: class GoogleAuthError extends Error {
    revoked = true;
  },
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
  const pending = await t.run(async (ctx) =>
    ctx.db
      .query("calendarExternalChanges")
      .withIndex("by_owner_and_settledAt", (q) => q.eq("ownerId", OWNER).eq("settledAt", undefined))
      .unique(),
  );
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
  expect(
    await t.run(async (ctx) =>
      ctx.db
        .query("calendarExternalChanges")
        .withIndex("by_owner_and_settledAt", (q) =>
          q.eq("ownerId", OWNER).eq("settledAt", undefined),
        )
        .collect(),
    ),
  ).toEqual([]);
  expect(
    await t.run(async (ctx) => ctx.db.get("externalCalendarEvents", externalId)),
  ).toMatchObject(MOVED);
});

test.each(["move", "delete"] as const satisfies readonly ExternalChange["kind"][])(
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
      await t.run(async (ctx) =>
        ctx.db
          .query("calendarExternalChanges")
          .withIndex("by_owner_and_settledAt", (q) =>
            q.eq("ownerId", OWNER).eq("settledAt", undefined),
          )
          .collect(),
      ),
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
  expect(
    await t.run(async (ctx) =>
      ctx.db
        .query("calendarExternalChanges")
        .withIndex("by_owner_and_settledAt", (q) =>
          q.eq("ownerId", OWNER).eq("settledAt", undefined),
        )
        .collect(),
    ),
  ).toEqual([]);
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
  expect(
    await t.run(async (ctx) =>
      ctx.db
        .query("calendarExternalChanges")
        .withIndex("by_owner_and_settledAt", (q) =>
          q.eq("ownerId", OWNER).eq("settledAt", undefined),
        )
        .collect(),
    ),
  ).toEqual([]);
});

test.each([400, 403, 429])(
  "再認証後の %s は後続の送信を止めず、失敗時は最新cursorでpullする",
  async (status) => {
    const { externalId, owner, t } = await setup();
    await owner.mutation(api.mutations.calendarSync.moveExternal.moveExternal, {
      externalId,
      ...MOVED,
    });
    const secondId = await t.run(async (ctx) => {
      await ctx.db.insert("calendarSyncCursors", {
        ownerId: OWNER,
        calendarId: CALENDAR,
        syncToken: "old",
        fullSyncedOnJst: TODAY,
      });
      return ctx.db.insert("externalCalendarEvents", {
        allDay: false,
        calendarId: CALENDAR,
        googleEventId: "later-event",
        googleUpdated: "2026-08-17T00:00:00Z",
        ownerId: OWNER,
        startAt: `${TODAY} 10:00:00`,
        endAt: `${TODAY} 11:00:00`,
        title: "後続",
      });
    });
    await owner.mutation(api.mutations.calendarSync.moveExternal.moveExternal, {
      externalId: secondId,
      ...MOVED,
    });
    tokenState.fail = true;
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    tokenState.fail = false;
    const patched: string[] = [];
    const cursors: (string | null)[] = [];
    let fail = true;
    vi.stubGlobal("fetch", async (url: URL, init: RequestInit) => {
      if (init.method === "PATCH") {
        patched.push(url.pathname);
        if (url.pathname.endsWith("/event") && fail) {
          return Response.json(
            { error: { message: "Rejected", errors: [{ reason: "forbidden" }] } },
            { status },
          );
        }
        return Response.json({
          ...googleEvent(),
          id: url.pathname.endsWith("/event") ? "event" : "later-event",
        });
      }
      cursors.push(url.searchParams.get("syncToken"));
      return Response.json({
        items: [
          {
            ...googleEvent(),
            start: { dateTime: "2026-08-17T10:00:00+09:00" },
            end: { dateTime: "2026-08-17T11:00:00+09:00" },
          },
          { ...googleEvent(), id: "later-event" },
        ],
        nextSyncToken: "fresh",
      });
    });
    expect(await owner.action(api.actions.calendarSync.syncNow.syncNow, {})).toBe("error");
    expect(patched).toHaveLength(2);
    expect(patched[1]).toContain("later-event");
    expect(cursors).toEqual([status === 429 ? "old" : null]);
    const pending = await t.run(async (ctx) =>
      ctx.db
        .query("calendarExternalChanges")
        .withIndex("by_owner_and_settledAt", (q) =>
          q.eq("ownerId", OWNER).eq("settledAt", undefined),
        )
        .collect(),
    );
    expect(pending).toHaveLength(status === 429 ? 1 : 0);
    expect(
      await t.run(async (ctx) => ctx.db.get("externalCalendarEvents", externalId)),
    ).toMatchObject(
      status === 429 ? MOVED : { startAt: `${TODAY} 10:00:00`, endAt: `${TODAY} 11:00:00` },
    );
    fail = false;
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    expect(
      await t.run(async (ctx) =>
        ctx.db
          .query("calendarExternalChanges")
          .withIndex("by_owner_and_settledAt", (q) =>
            q.eq("ownerId", OWNER).eq("settledAt", undefined),
          )
          .collect(),
      ),
    ).toEqual([]);
    expect(patched).toHaveLength(status === 429 ? 3 : 2);
  },
);

test("一括再送は100件を超えても各変更を一度ずつ送信する", async () => {
  const { owner, t } = await setup();
  await t.run(async (ctx) => {
    for (let index = 0; index < 101; index += 1) {
      await ctx.db.insert("calendarExternalChanges", {
        ownerId: OWNER,
        calendarId: CALENDAR,
        googleEventId: `event-${index}`,
        change: { kind: "delete" },
      });
    }
  });
  const deleted: string[] = [];
  vi.stubGlobal("fetch", async (url: URL, init: RequestInit) => {
    if (init.method === "DELETE") {
      deleted.push(url.pathname);
      return new Response(null, { status: 204 });
    }
    return Response.json({ items: [], nextSyncToken: "fresh" });
  });
  expect(await owner.action(api.actions.calendarSync.syncNow.syncNow, {})).toBe("ok");
  expect(new Set(deleted).size).toBe(101);
  expect(deleted).toHaveLength(101);
  expect(
    await t.run(async (ctx) =>
      ctx.db
        .query("calendarExternalChanges")
        .withIndex("by_owner_and_settledAt", (q) =>
          q.eq("ownerId", OWNER).eq("settledAt", undefined),
        )
        .collect(),
    ),
  ).toEqual([]);
});

test.each(["move", "delete"] as const satisfies readonly ExternalChange["kind"][])(
  "旧形式の予約済み %s は未送信管理を経由して送信する",
  async (kind) => {
    const { t } = await setup();
    const methods: string[] = [];
    vi.stubGlobal("fetch", async (_url: URL, init: RequestInit) => {
      methods.push(init.method ?? "GET");
      return init.method === "DELETE"
        ? new Response(null, { status: 204 })
        : Response.json(googleEvent());
    });
    await t.action(internal.actions.calendarSync.pushExternal.pushExternal, {
      attempt: 1,
      calendarId: CALENDAR,
      googleEventId: "event",
      ownerId: OWNER,
      change: kind === "delete" ? { kind } : { kind, allDay: false, ...MOVED },
    });
    expect(await pendingId(t)).toBeDefined();
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    expect(methods).toEqual([kind === "delete" ? "DELETE" : "PATCH"]);
    expect(
      await t.run(async (ctx) =>
        ctx.db
          .query("calendarExternalChanges")
          .withIndex("by_owner_and_settledAt", (q) =>
            q.eq("ownerId", OWNER).eq("settledAt", undefined),
          )
          .collect(),
      ),
    ).toEqual([]);
  },
);

test("旧形式の再試行は新しい未送信変更を置き換えない", async () => {
  const { externalId, owner, t } = await setup();
  await owner.mutation(api.mutations.calendarSync.moveExternal.moveExternal, {
    externalId,
    ...MOVED,
  });
  const id = await pendingId(t);
  await t.action(internal.actions.calendarSync.pushExternal.pushExternal, {
    attempt: 1,
    calendarId: CALENDAR,
    googleEventId: "event",
    ownerId: OWNER,
    change: { kind: "delete" },
  });
  expect(await pendingId(t)).toBe(id);
  expect(await t.run(async (ctx) => ctx.db.get("calendarExternalChanges", id))).toMatchObject({
    change: { kind: "move", ...MOVED },
  });
});

test("切断後の旧形式ジョブは未送信変更を復活させない", async () => {
  const { t } = await setup();
  await t.run(async (ctx) => clearConnection(ctx, OWNER));
  await t.action(internal.actions.calendarSync.pushExternal.pushExternal, {
    attempt: 1,
    calendarId: CALENDAR,
    googleEventId: "event",
    ownerId: OWNER,
    change: { kind: "delete" },
  });
  expect(
    await t.run(async (ctx) =>
      ctx.db
        .query("calendarExternalChanges")
        .withIndex("by_owner_and_settledAt", (q) =>
          q.eq("ownerId", OWNER).eq("settledAt", undefined),
        )
        .collect(),
    ),
  ).toEqual([]);
});

test.each(["move", "delete"] as const satisfies readonly ExternalChange["kind"][])(
  "新しい移動の送信完了後に届いた旧 %s は送信しない",
  async (kind) => {
    const { externalId, owner, t } = await setup();
    await owner.mutation(api.mutations.calendarSync.moveExternal.moveExternal, {
      externalId,
      ...MOVED,
    });
    const fetch = vi.fn(async () => Response.json(googleEvent()));
    vi.stubGlobal("fetch", fetch);
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    await t.run(async (ctx) =>
      applyPull(ctx, {
        calendarId: CALENDAR,
        ownerId: OWNER,
        todayJst: TODAY,
        finish: null,
        events: [
          {
            kind: "upsert",
            allDay: false,
            calendarId: CALENDAR,
            googleEventId: "event",
            ...MOVED,
            title: "予定",
            updated: "2026-08-17T03:01:00Z",
          },
        ],
      }),
    );
    await t.action(internal.actions.calendarSync.pushExternal.pushExternal, {
      attempt: 2,
      ownerId: OWNER,
      calendarId: CALENDAR,
      googleEventId: "event",
      change:
        kind === "delete"
          ? { kind }
          : { kind, allDay: false, startAt: `${TODAY} 12:00:00`, endAt: `${TODAY} 13:00:00` },
    });
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(
      await t.run(async (ctx) =>
        ctx.db
          .query("calendarExternalChanges")
          .withIndex("by_owner_and_settledAt", (q) =>
            q.eq("ownerId", OWNER).eq("settledAt", undefined),
          )
          .collect(),
      ),
    ).toEqual([]);
    expect(
      await t.run(async (ctx) => ctx.db.get("externalCalendarEvents", externalId)),
    ).toMatchObject(MOVED);
  },
);

test("旧削除の再試行はpullで復活した未編集の写しがあっても送信する", async () => {
  const { t } = await setup();
  const fetch = vi.fn(async () => new Response(null, { status: 204 }));
  vi.stubGlobal("fetch", fetch);
  await t.action(internal.actions.calendarSync.pushExternal.pushExternal, {
    attempt: 2,
    ownerId: OWNER,
    calendarId: CALENDAR,
    googleEventId: "event",
    change: { kind: "delete" },
  });
  await t.finishAllScheduledFunctions(vi.runAllTimers);
  expect(fetch).toHaveBeenCalledTimes(1);
});

test("互換引数に必要なフィールドが足りなければ処理しない", async () => {
  const { t } = await setup();
  await expect(
    t.action(internal.actions.calendarSync.pushExternal.pushExternal, { attempt: 0 }),
  ).rejects.toThrow();
  expect(
    await t.run(async (ctx) =>
      ctx.db
        .query("calendarExternalChanges")
        .withIndex("by_owner_and_settledAt", (q) =>
          q.eq("ownerId", OWNER).eq("settledAt", undefined),
        )
        .collect(),
    ),
  ).toEqual([]);
});

test.each(["move", "delete"] as const satisfies readonly ExternalChange["kind"][])(
  "キャッシュ掃除後も送信済みの編集を旧 %s で上書きしない",
  async (kind) => {
    const { externalId, owner, t } = await setup();
    await owner.mutation(api.mutations.calendarSync.moveExternal.moveExternal, {
      externalId,
      ...MOVED,
    });
    const fetch = vi.fn(async () => Response.json(googleEvent()));
    vi.stubGlobal("fetch", fetch);
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    await t.run(async (ctx) => ctx.db.delete("externalCalendarEvents", externalId));
    await t.action(internal.actions.calendarSync.pushExternal.pushExternal, {
      attempt: 2,
      ownerId: OWNER,
      calendarId: CALENDAR,
      googleEventId: "event",
      change:
        kind === "delete"
          ? { kind }
          : { kind, allDay: false, startAt: `${TODAY} 12:00:00`, endAt: `${TODAY} 13:00:00` },
    });
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(
      await t.run(async (ctx) => ctx.db.query("calendarExternalChanges").unique()),
    ).toMatchObject({
      change: { kind: "move", ...MOVED },
      settledAt: expect.any(Number),
    });
  },
);

test.each(["refresh", "reconnect", "switch-account"] as const satisfies readonly string[])(
  "接続の %s は旧ジョブの採用範囲を維持する",
  async (operation) => {
    const { t } = await setup();
    await t.run(async (ctx) => {
      if (operation !== "refresh") await clearConnection(ctx, OWNER);
      await upsertConnection(ctx, {
        ownerId: OWNER,
        googleAccountId: operation === "switch-account" ? "another-account" : "google-owner",
        googleEmail: CALENDAR,
        calendars: [{ accessRole: "owner", id: CALENDAR, primary: true, summary: "予定" }],
        defaultVisibleCalendarIds: [CALENDAR],
      });
    });
    const fetch = vi.fn(async () => new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetch);
    await t.action(internal.actions.calendarSync.pushExternal.pushExternal, {
      attempt: 2,
      ownerId: OWNER,
      calendarId: CALENDAR,
      googleEventId: "event",
      change: { kind: "delete" },
    });
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    expect(fetch).toHaveBeenCalledTimes(operation === "refresh" ? 1 : 0);
  },
);

test("件名と色の編集直後に移動しても全変更をGoogleへ送信する", async () => {
  const { externalId, owner, t } = await setup();
  await owner.mutation(api.mutations.calendarSync.moveExternal.moveExternal, {
    externalId,
    ...MOVED,
    title: "定期検診",
    colorId: "11",
  });
  const finalRange = { startAt: `${TODAY} 16:00:00`, endAt: `${TODAY} 17:00:00` };
  await owner.mutation(api.mutations.calendarSync.moveExternal.moveExternal, {
    externalId,
    ...finalRange,
  });
  const id = await pendingId(t);
  const bodies: unknown[] = [];
  vi.stubGlobal("fetch", async (_url: URL, init: RequestInit) => {
    if (init.method === "PATCH") bodies.push(JSON.parse(String(init.body)));
    return Response.json({ ...googleEvent(), summary: "定期検診", colorId: "11" });
  });
  await t.action(internal.actions.calendarSync.pushExternal.pushExternal, {
    attempt: 0,
    pendingId: id,
  });
  expect(bodies).toEqual([
    {
      summary: "定期検診",
      colorId: "11",
      start: { date: null, dateTime: "2026-08-17T16:00:00+09:00" },
      end: { date: null, dateTime: "2026-08-17T17:00:00+09:00" },
    },
  ]);
  expect(await t.run((ctx) => ctx.db.get("externalCalendarEvents", externalId))).toMatchObject({
    ...finalRange,
    title: "定期検診",
    colorId: "11",
  });
});

test("Googleの予定色の変更と解除を取り込む", async () => {
  const { externalId, t } = await setup();
  for (const colorId of ["9", undefined]) {
    await t.run((ctx) =>
      applyPull(ctx, {
        finish: null,
        calendarId: CALENDAR,
        ownerId: OWNER,
        todayJst: TODAY,
        events: [
          {
            kind: "upsert",
            allDay: false,
            calendarId: CALENDAR,
            googleEventId: "event",
            ...MOVED,
            title: "Googleの件名",
            updated: "2026-08-17T06:00:00Z",
            ...(colorId === undefined ? {} : { colorId }),
          },
        ],
      }),
    );
    const event = await t.run((ctx) => ctx.db.get("externalCalendarEvents", externalId));
    expect(event?.colorId).toBe(colorId);
  }
});
