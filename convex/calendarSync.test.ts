import { Result } from "better-result";
import { convexTest } from "convex-test";
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";

import { api, internal } from "./_generated/api";
import { GOOGLE_CALENDAR_WRITE_SCOPES } from "./lib/calendarSync";
import { GoogleAuthError } from "./lib/googleAccessToken";
import type { GoalInput } from "./lib/validators";
import schema from "./schema";
import { connect as connectCalendar } from "./services/calendarSync/connect";

const { tokenState } = vi.hoisted(() => ({
  tokenState: { accounts: [{ accountId: "google-sub", scopes: [] as string[] }], fail: false },
}));

vi.mock("./lib/googleAccessToken", () => ({
  GoogleAuthError: class GoogleAuthError extends Error {
    revoked = true;
  },
  getGoogleAccessToken: async () =>
    tokenState.fail
      ? Result.err(new GoogleAuthError({ message: "expired" }))
      : Result.ok("access-token"),
  listGoogleAccounts: async () => tokenState.accounts,
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

const OWNER = { email: "owner@example.com", subject: "owner-subject" };
const OTHER = { email: "other@example.com", subject: "other-subject" };
const TODAY = "2026-08-17";
const PRIMARY = "owner@example.com";
const HOLIDAY = "ja.japanese#holiday@group.v.calendar.google.com";
const CALENDAR_SCOPES = [...GOOGLE_CALENDAR_WRITE_SCOPES];

type FakeEvent = {
  colorId?: string;
  description?: string;
  end: { date?: string; dateTime?: string };
  id: string;
  start: { date?: string; dateTime?: string };
  status: "cancelled" | "confirmed";
  summary?: string;
  transparency?: string;
  updated: string;
  version: number;
};

class FakeGoogle {
  calendars = new Map<string, Map<string, FakeEvent>>([
    [PRIMARY, new Map()],
    [HOLIDAY, new Map()],
  ]);
  requests: string[] = [];
  version = 0;
  private sequence = 0;

  private nextVersion(): number {
    this.version += 1;
    return this.version;
  }

  private stamp(): string {
    this.sequence += 1;
    return new Date(Date.UTC(2026, 7, 17, 3, 0, this.sequence)).toISOString();
  }

  upsertExternal(calendarId: string, event: Omit<FakeEvent, "updated" | "version">): void {
    const calendar = this.calendars.get(calendarId);
    if (calendar === undefined) {
      throw new Error(`unknown calendar ${calendarId}`);
    }
    calendar.set(event.id, { ...event, updated: this.stamp(), version: this.nextVersion() });
  }

  cancel(calendarId: string, eventId: string): void {
    const calendar = this.calendars.get(calendarId);
    const existing = calendar?.get(eventId);
    if (calendar === undefined || existing === undefined) {
      throw new Error(`unknown event ${eventId}`);
    }
    calendar.set(eventId, {
      ...existing,
      status: "cancelled",
      updated: this.stamp(),
      version: this.nextVersion(),
    });
  }

  active(calendarId: string): FakeEvent[] {
    return [...(this.calendars.get(calendarId)?.values() ?? [])].filter(
      (event) => event.status === "confirmed",
    );
  }

  fetch = async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const url = new URL(
      typeof input === "string" ? input : input instanceof URL ? input : input.url,
    );
    const method = init?.method ?? "GET";
    this.requests.push(`${method} ${url.pathname}`);
    const path = url.pathname.replace("/calendar/v3", "");
    if (path === "/users/me/calendarList") {
      return json({
        items: [
          {
            accessRole: "owner",
            backgroundColor: "#9fe1cb",
            id: PRIMARY,
            primary: true,
            selected: true,
            summary: PRIMARY,
          },
          { accessRole: "reader", id: HOLIDAY, selected: true, summary: "日本の祝日" },
        ],
      });
    }
    const match = /^\/calendars\/([^/]+)\/events(?:\/([^/]+))?$/.exec(path);
    if (match === null) {
      return json({ error: { message: "not found" } }, 404);
    }
    const calendarId = decodeURIComponent(match[1] ?? "");
    const eventId = match[2] === undefined ? null : decodeURIComponent(match[2]);
    const calendar = this.calendars.get(calendarId === "primary" ? PRIMARY : calendarId);
    if (calendar === undefined) {
      return json({ error: { message: "calendar not found" } }, 404);
    }
    if (method === "GET" && eventId === null) {
      const syncToken = url.searchParams.get("syncToken");
      const since = syncToken === null ? -1 : Number(syncToken);
      if (syncToken !== null && Number.isNaN(since)) {
        return json({ error: { message: "sync token expired" } }, 410);
      }
      const items = [...calendar.values()].filter((event) =>
        syncToken === null ? event.status === "confirmed" : event.version > since,
      );
      return json({ items, nextSyncToken: String(this.version) });
    }
    if (method === "POST" && eventId === null) {
      const body = JSON.parse(String(init?.body)) as Omit<
        FakeEvent,
        "id" | "status" | "updated" | "version"
      >;
      this.sequence += 1;
      const id = `ev${String(this.sequence)}`;
      const event: FakeEvent = {
        ...body,
        id,
        status: "confirmed",
        updated: this.stamp(),
        version: this.nextVersion(),
      };
      calendar.set(id, event);
      return json(event);
    }
    if (eventId === null) {
      return json({ error: { message: "bad request" } }, 400);
    }
    const existing = calendar.get(eventId);
    if (existing === undefined || existing.status === "cancelled") {
      return json({ error: { message: "not found" } }, existing === undefined ? 404 : 410);
    }
    if (method === "PATCH") {
      const body = JSON.parse(String(init?.body)) as Partial<FakeEvent>;
      const next: FakeEvent = {
        ...existing,
        ...body,
        end: mergeTime(existing.end, body.end),
        start: mergeTime(existing.start, body.start),
        updated: this.stamp(),
        version: this.nextVersion(),
      };
      calendar.set(eventId, next);
      return json(next);
    }
    if (method === "DELETE") {
      calendar.set(eventId, {
        ...existing,
        status: "cancelled",
        updated: this.stamp(),
        version: this.nextVersion(),
      });
      return new Response(null, { status: 204 });
    }
    return json({ error: { message: "unsupported" } }, 405);
  };
}

function mergeTime(
  current: FakeEvent["start"],
  patch: Record<string, string | null | undefined> | undefined,
): FakeEvent["start"] {
  if (patch === undefined) {
    return current;
  }
  const merged: Record<string, string> = { ...current };
  for (const [key, value] of Object.entries(patch)) {
    if (value === null) {
      delete merged[key];
    } else if (value !== undefined) {
      merged[key] = value;
    }
  }
  if ("date" in merged && "dateTime" in merged) {
    throw new Error("Google rejects an event time with both date and dateTime");
  }
  return merged;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status,
  });
}

let google: FakeGoogle;

function flush(t: ReturnType<typeof raw>) {
  return t.finishAllScheduledFunctions(() => vi.runAllTimers());
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(`${TODAY}T12:00:00+09:00`));
  google = new FakeGoogle();
  vi.stubGlobal("fetch", google.fetch);
  tokenState.fail = false;
  tokenState.accounts = [{ accountId: "google-sub", scopes: CALENDAR_SCOPES }];
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const EXAM_GOAL = {
  content: "本番で900点を取る",
  examDate: "2026-10-01",
  maxScore: 900,
  minScore: 800,
  type: "exam",
} as const satisfies GoalInput;

function raw() {
  return convexTest(schema, modules);
}

type Owner = ReturnType<ReturnType<typeof raw>["withIdentity"]>;

async function connectAccount(owner: Owner, googleAccountId = "google-sub") {
  await owner.run(async (ctx) => {
    const existing = await ctx.db
      .query("calendarConnections")
      .withIndex("by_owner_and_googleAccountId", (q) => q.eq("ownerId", OWNER.subject))
      .first();
    if (existing !== null) return;
    await ctx.db.insert("calendarConnections", {
      ownerId: OWNER.subject,
      googleAccountId,
      googleEmail: PRIMARY,
      primaryCalendarId: PRIMARY,
      status: "ok",
      calendars: [
        { id: PRIMARY, primary: true, summary: PRIMARY, accessRole: "owner" },
        { id: HOLIDAY, primary: false, summary: "日本の祝日", accessRole: "reader" },
      ],
      visibleCalendarIds: [PRIMARY, HOLIDAY],
    });
  });
  return owner.action((ctx) => connectCalendar(ctx, OWNER.subject, googleAccountId));
}

async function connectedOwner() {
  const t = raw();
  const owner = t.withIdentity(OWNER);
  await owner.mutation(api.mutations.catalog.ensure.ensure, {});
  await owner.mutation(api.mutations.days.open.open, { dateJst: TODAY, todayJst: TODAY });
  await connectAccount(owner);
  return { owner, t };
}

async function firstRowId(owner: Owner) {
  const day = await owner.query(api.queries.days.get.get, { dateJst: TODAY, todayJst: TODAY });
  const row = day.rows[0];
  if (row === undefined) {
    throw new Error("expected a row");
  }
  return row._id;
}

async function syncNow(owner: Owner) {
  return owner.action(api.actions.calendarSync.syncNow.syncNow, {});
}

test("連携すると接続とカレンダー一覧が写り、進行中の本番日が Google に載る", async () => {
  const t = raw();
  const owner = t.withIdentity(OWNER);
  await owner.mutation(api.mutations.goals.create.create, { goal: EXAM_GOAL });

  await connectAccount(owner);

  const status = await owner.query(api.queries.calendarSync.status.status, {});
  expect(status.connections[0]?.googleEmail).toBe(PRIMARY);
  expect(status.connections[0]?.status).toBe("ok");
  expect(status.connections[0]?.calendars.map((calendar) => calendar.id)).toEqual([
    PRIMARY,
    HOLIDAY,
  ]);
  expect(status.connections[0]?.visibleCalendarIds).toEqual([PRIMARY, HOLIDAY]);
  const [event] = google.active(PRIMARY);
  expect(event).toMatchObject({
    description: "目標 800〜900",
    end: { date: "2026-10-02" },
    start: { date: "2026-10-01" },
    summary: "本番: 本番で900点を取る",
    transparency: "transparent",
  });
  expect(
    await t.withIdentity(OTHER).query(api.queries.calendarSync.status.status, {}),
  ).toMatchObject({ connections: [], output: null });
});

test("カレンダー権限の無い Google アカウントしか無ければ連携できない", async () => {
  tokenState.accounts = [{ accountId: "google-sub", scopes: ["openid", "email"] }];
  const owner = raw().withIdentity(OWNER);
  await expect(connectAccount(owner)).rejects.toThrow();
});

test("予定の作成・移動・削除が Google に送られる", async () => {
  const { owner, t } = await connectedOwner();
  const rowId = await firstRowId(owner);

  const blockId = await owner.mutation(api.mutations.boardSchedule.create.create, {
    color: "green",
    endAt: `${TODAY} 10:30:00`,
    rowId,
    startAt: `${TODAY} 09:00:00`,
  });
  await flush(t);
  let [event] = google.active(PRIMARY);
  expect(event).toMatchObject({
    colorId: "10",
    end: { dateTime: "2026-08-17T10:30:00+09:00" },
    start: { dateTime: "2026-08-17T09:00:00+09:00" },
    transparency: "opaque",
  });

  await owner.mutation(api.mutations.boardSchedule.move.move, {
    blockId,
    endAt: `${TODAY} 14:00:00`,
    startAt: `${TODAY} 13:00:00`,
  });
  await flush(t);
  [event] = google.active(PRIMARY);
  expect(event?.start).toEqual({ dateTime: "2026-08-17T13:00:00+09:00" });

  await owner.mutation(api.mutations.boardSchedule.remove.remove, { blockId });
  await flush(t);
  expect(google.active(PRIMARY)).toHaveLength(0);
});

test("結果を入れて終了した本番は Google から消え、達成したチェックポイントも消える", async () => {
  const { owner, t } = await connectedOwner();
  const examId = await owner.mutation(api.mutations.goals.create.create, { goal: EXAM_GOAL });
  const checkpointId = await owner.mutation(api.mutations.goals.create.create, {
    goal: {
      content: "Unit 1-10 を音読",
      criterion: "止まらずに読める",
      deadline: "2026-09-30",
      parentGoalId: examId,
      type: "mastery",
    },
  });
  await flush(t);
  expect(
    google
      .active(PRIMARY)
      .map((event) => event.summary)
      .toSorted(),
  ).toEqual(["期限: Unit 1-10 を音読", "本番: 本番で900点を取る"]);

  await owner.mutation(api.mutations.goals.setAchieved.setAchieved, {
    achievedAt: TODAY,
    goalId: checkpointId,
  });
  await owner.mutation(api.mutations.goals.setExamResult.setExamResult, {
    goalId: examId,
    result: { recordedAt: "2026-10-05", score: 855 },
  });
  await flush(t);
  expect(google.active(PRIMARY)).toHaveLength(0);
});

test("Google 側の外部予定は写しとして予定タブの範囲で読め、期間の外は持たない", async () => {
  const { owner, t } = await connectedOwner();
  google.upsertExternal(PRIMARY, {
    end: { dateTime: "2026-08-18T11:00:00+09:00" },
    id: "dentist",
    start: { dateTime: "2026-08-18T10:00:00+09:00" },
    status: "confirmed",
    summary: "歯医者",
  });
  google.upsertExternal(HOLIDAY, {
    end: { date: "2026-09-24" },
    id: "holiday",
    start: { date: "2026-09-23" },
    status: "confirmed",
    summary: "秋分の日",
  });
  google.upsertExternal(PRIMARY, {
    end: { date: "2027-01-02" },
    id: "far",
    start: { date: "2027-01-01" },
    status: "confirmed",
    summary: "来年の予定",
  });

  expect(await syncNow(owner)).toBe("ok");

  const week = await owner.query(api.queries.calendarSync.listExternal.listExternal, {
    anchorDateJst: TODAY,
    view: "week",
  });
  expect(week).toEqual([
    {
      _id: expect.any(String),
      allDay: false,
      calendarId: PRIMARY,
      calendarName: PRIMARY,
      calendarEmail: PRIMARY,
      colorId: null,
      canEdit: true,
      color: "#9fe1cb",
      endAt: "2026-08-18 11:00:00",
      startAt: "2026-08-18 10:00:00",
      title: "歯医者",
    },
  ]);
  const month = await owner.query(api.queries.calendarSync.listExternal.listExternal, {
    anchorDateJst: "2026-09-01",
    view: "month",
  });
  expect(month.map((event) => event.title)).toEqual(["秋分の日"]);
  const year = await owner.query(api.queries.calendarSync.listExternal.listExternal, {
    anchorDateJst: TODAY,
    view: "year",
  });
  expect(year.map((event) => event.title).toSorted()).toEqual(["歯医者", "秋分の日"]);
  const september = await owner.query(api.queries.calendarSync.listExternal.listExternal, {
    anchorDateJst: "2026-09-23",
    view: "week",
  });
  expect(september.map((event) => [event.title, event.allDay, event.startAt, event.endAt])).toEqual(
    [["秋分の日", true, "2026-09-23 00:00:00", "2026-09-23 23:59:59"]],
  );
  const nextYear = await owner.query(api.queries.calendarSync.listExternal.listExternal, {
    anchorDateJst: "2027-01-01",
    view: "week",
  });
  expect(nextYear).toEqual([]);
  expect(
    await t.withIdentity(OTHER).query(api.queries.calendarSync.listExternal.listExternal, {
      anchorDateJst: TODAY,
      view: "week",
    }),
  ).toEqual([]);

  await owner.mutation(api.mutations.calendarSync.setVisibleCalendars.setVisibleCalendars, {
    calendarIds: [PRIMARY],
  });
  await flush(t);
  expect(
    await owner.query(api.queries.calendarSync.listExternal.listExternal, {
      anchorDateJst: "2026-09-23",
      view: "week",
    }),
  ).toEqual([]);
});

test("Google で動かした予定はアプリに戻り、消した予定はアプリでも消える", async () => {
  const { owner, t } = await connectedOwner();
  const rowId = await firstRowId(owner);
  const blockId = await owner.mutation(api.mutations.boardSchedule.create.create, {
    endAt: `${TODAY} 10:30:00`,
    rowId,
    startAt: `${TODAY} 09:00:00`,
  });
  await flush(t);
  const [event] = google.active(PRIMARY);
  if (event === undefined) {
    throw new Error("expected the block in Google");
  }

  google.upsertExternal(PRIMARY, {
    ...event,
    end: { dateTime: "2026-08-17T16:00:00+09:00" },
    start: { dateTime: "2026-08-17T15:00:00+09:00" },
  });
  await syncNow(owner);
  const [moved] = await owner.query(api.queries.boardSchedule.listForWeek.listForWeek, {
    anchorDateJst: TODAY,
    view: "week",
  });
  expect(moved).toMatchObject({
    _id: blockId,
    endAt: `${TODAY} 16:00:00`,
    startAt: `${TODAY} 15:00:00`,
  });
  const updatedAfterPull = google.active(PRIMARY)[0]?.updated;
  await syncNow(owner);
  expect(google.active(PRIMARY)[0]?.updated).toBe(updatedAfterPull);

  google.cancel(PRIMARY, event.id);
  await syncNow(owner);
  expect(
    await owner.query(api.queries.boardSchedule.listForWeek.listForWeek, {
      anchorDateJst: TODAY,
      view: "week",
    }),
  ).toEqual([]);
});

test("Google で本番日を動かすと本番日が変わり、消しても目標は残って予定が戻る", async () => {
  const { owner } = await connectedOwner();
  await owner.mutation(api.mutations.goals.create.create, { goal: EXAM_GOAL });
  await syncNow(owner);
  const [event] = google.active(PRIMARY);
  if (event === undefined) {
    throw new Error("expected the exam in Google");
  }

  google.upsertExternal(PRIMARY, {
    ...event,
    end: { date: "2026-10-16" },
    start: { date: "2026-10-15" },
  });
  await syncNow(owner);
  const [exam] = await owner.query(api.queries.goals.list.list, {});
  expect(exam?.type === "exam" && exam.examDate).toBe("2026-10-15");

  google.cancel(PRIMARY, event.id);
  await syncNow(owner);
  const goals = await owner.query(api.queries.goals.list.list, {});
  expect(goals).toHaveLength(1);
  const [restored] = google.active(PRIMARY);
  expect(restored?.id).not.toBe(event.id);
  expect(restored?.start).toEqual({ date: "2026-10-15" });
});

test("外部予定をアプリで動かす・消すと Google に反映される", async () => {
  const { owner, t } = await connectedOwner();
  google.upsertExternal(PRIMARY, {
    end: { dateTime: "2026-08-18T11:00:00+09:00" },
    id: "dentist",
    start: { dateTime: "2026-08-18T10:00:00+09:00" },
    status: "confirmed",
    summary: "歯医者",
  });
  await syncNow(owner);
  const [external] = await owner.query(api.queries.calendarSync.listExternal.listExternal, {
    anchorDateJst: TODAY,
    view: "week",
  });
  if (external === undefined) {
    throw new Error("expected the external event");
  }

  await owner.mutation(api.mutations.calendarSync.moveExternal.moveExternal, {
    endAt: "2026-08-18 15:00:00",
    externalId: external._id,
    startAt: "2026-08-18 14:00:00",
  });
  await flush(t);
  expect(google.calendars.get(PRIMARY)?.get("dentist")?.start).toEqual({
    dateTime: "2026-08-18T14:00:00+09:00",
  });

  await owner.mutation(api.mutations.calendarSync.removeExternal.removeExternal, {
    externalId: external._id,
  });
  await flush(t);
  expect(google.active(PRIMARY)).toHaveLength(0);
  await expect(
    t.withIdentity(OTHER).mutation(api.mutations.calendarSync.removeExternal.removeExternal, {
      externalId: external._id,
    }),
  ).rejects.toThrow();
});

test("解除すると Google のアプリ発の予定と、アプリ側の写し・対応表がすべて消える", async () => {
  const { owner, t } = await connectedOwner();
  await owner.mutation(api.mutations.goals.create.create, { goal: EXAM_GOAL });
  google.upsertExternal(PRIMARY, {
    end: { dateTime: "2026-08-18T11:00:00+09:00" },
    id: "dentist",
    start: { dateTime: "2026-08-18T10:00:00+09:00" },
    status: "confirmed",
    summary: "歯医者",
  });
  await syncNow(owner);
  expect(
    google
      .active(PRIMARY)
      .map((event) => event.summary)
      .toSorted(),
  ).toEqual(["本番: 本番で900点を取る", "歯医者"]);

  await owner.action(api.actions.calendarSync.disconnect.disconnect, {});

  expect(google.active(PRIMARY).map((event) => event.summary)).toEqual(["歯医者"]);
  expect(await owner.query(api.queries.calendarSync.status.status, {})).toMatchObject({
    connections: [],
    output: null,
  });
  expect(
    await owner.query(api.queries.calendarSync.listExternal.listExternal, {
      anchorDateJst: TODAY,
      view: "week",
    }),
  ).toEqual([]);
  await t.run(async (ctx) => {
    expect(await ctx.db.query("calendarSyncLinks").collect()).toEqual([]);
    expect(await ctx.db.query("calendarSyncCursors").collect()).toEqual([]);
  });
});

test("トークンが取れなくなったら再接続が必要になり、cron は触らない", async () => {
  const { owner, t } = await connectedOwner();
  tokenState.fail = true;

  expect(await syncNow(owner)).toBe("needsReauth");
  expect(
    (await owner.query(api.queries.calendarSync.status.status, {})).connections[0]?.status,
  ).toBe("needsReauth");
  expect(
    (
      await t.query(internal.queries.calendarSync.connectedPage.connectedPage, {
        paginationOpts: { cursor: null, numItems: 10 },
      })
    ).page,
  ).toEqual([]);
  tokenState.fail = false;
  await connectAccount(owner);
  expect(
    (await owner.query(api.queries.calendarSync.status.status, {})).connections[0]?.status,
  ).toBe("ok");
});

test("送信の記録は、計画時と対応表が違えば書かない（並走の楽観ロック）", async () => {
  const { owner, t } = await connectedOwner();
  const examId = await owner.mutation(api.mutations.goals.create.create, { goal: EXAM_GOAL });
  await flush(t);
  const link = await t.run(async (ctx) =>
    ctx.db
      .query("calendarSyncLinks")
      .withIndex("by_source", (q) => q.eq("sourceKind", "goal").eq("sourceId", examId))
      .unique(),
  );
  if (link === null) {
    throw new Error("expected a link");
  }

  const stale = await t.mutation(internal.mutations.calendarSync.recordPush.recordPush, {
    calendarId: link.calendarId,
    expected: null,
    outcome: { googleEventId: "ghost", googleUpdated: "", kind: "upserted", payloadKey: "k" },
    ownerId: OWNER.subject,
    sourceId: examId,
    sourceKind: "goal",
  });
  expect(stale).toBe("conflict");
  const unchanged = await t.run(async (ctx) => ctx.db.get("calendarSyncLinks", link._id));
  expect(unchanged?.googleEventId).toBe(link.googleEventId);

  const fresh = await t.mutation(internal.mutations.calendarSync.recordPush.recordPush, {
    calendarId: link.calendarId,
    expected: link.googleEventId,
    outcome: {
      googleEventId: link.googleEventId,
      googleUpdated: "u2",
      kind: "upserted",
      payloadKey: link.payloadKey ?? "",
    },
    ownerId: OWNER.subject,
    sourceId: examId,
    sourceKind: "goal",
  });
  expect(fresh).toBe("recorded");
});

test("レート制限（403 rateLimitExceeded）は再接続にせず、再試行で送り切る", async () => {
  const { owner, t } = await connectedOwner();
  const original = google.fetch;
  let failures = 0;
  vi.stubGlobal("fetch", async (input: string | URL | Request, init?: RequestInit) => {
    if ((init?.method ?? "GET") === "POST" && failures < 1) {
      failures += 1;
      return json(
        { error: { errors: [{ reason: "rateLimitExceeded" }], message: "Rate Limit Exceeded" } },
        403,
      );
    }
    return original(input, init);
  });

  await owner.mutation(api.mutations.goals.create.create, { goal: EXAM_GOAL });
  await flush(t);

  expect(failures).toBe(1);
  expect(google.active(PRIMARY).map((event) => event.summary)).toEqual(["本番: 本番で900点を取る"]);
  expect(
    (await owner.query(api.queries.calendarSync.status.status, {})).connections[0]?.status,
  ).toBe("ok");
});

test("差分トークンが失効（410）したら期間の全件を取り直し、もう無い写しを消す", async () => {
  const { owner, t } = await connectedOwner();
  google.upsertExternal(PRIMARY, {
    end: { dateTime: "2026-08-18T11:00:00+09:00" },
    id: "dentist",
    start: { dateTime: "2026-08-18T10:00:00+09:00" },
    status: "confirmed",
    summary: "歯医者",
  });
  await syncNow(owner);
  google.calendars.get(PRIMARY)?.delete("dentist");
  await t.run(async (ctx) => {
    const cursors = await ctx.db.query("calendarSyncCursors").collect();
    await Promise.all(
      cursors.map((cursor) =>
        ctx.db.patch("calendarSyncCursors", cursor._id, { syncToken: "expired" }),
      ),
    );
  });
  google.requests = [];

  expect(await syncNow(owner)).toBe("ok");

  expect(google.requests.some((entry) => entry.startsWith("GET /calendar/v3/calendars/"))).toBe(
    true,
  );
  expect(
    await owner.query(api.queries.calendarSync.listExternal.listExternal, {
      anchorDateJst: TODAY,
      view: "week",
    }),
  ).toEqual([]);
});

test("全件を取った日から 7 日たつと差分ではなく全件を取り直す", async () => {
  const { owner, t } = await connectedOwner();
  await syncNow(owner);
  const before = await t.run(async (ctx) => ctx.db.query("calendarSyncCursors").collect());
  expect(before.every((cursor) => cursor.fullSyncedOnJst === TODAY)).toBe(true);

  vi.setSystemTime(new Date("2026-08-25T12:00:00+09:00"));
  google.requests = [];
  await syncNow(owner);

  const after = await t.run(async (ctx) => ctx.db.query("calendarSyncCursors").collect());
  expect(after.every((cursor) => cursor.fullSyncedOnJst === "2026-08-25")).toBe(true);
});

test("アプリ側の未送信の変更が新しければ Google の古い変更は捨てられ、アプリの時刻が Google に届く", async () => {
  const { owner, t } = await connectedOwner();
  const rowId = await firstRowId(owner);
  const blockId = await owner.mutation(api.mutations.boardSchedule.create.create, {
    endAt: `${TODAY} 10:30:00`,
    rowId,
    startAt: `${TODAY} 09:00:00`,
  });
  await flush(t);
  const [event] = google.active(PRIMARY);
  if (event === undefined) {
    throw new Error("expected the block in Google");
  }
  google.upsertExternal(PRIMARY, {
    ...event,
    end: { dateTime: "2026-08-17T16:00:00+09:00" },
    start: { dateTime: "2026-08-17T15:00:00+09:00" },
  });
  vi.setSystemTime(new Date("2026-08-17T20:00:00+09:00"));
  await owner.mutation(api.mutations.boardSchedule.move.move, {
    blockId,
    endAt: `${TODAY} 13:00:00`,
    startAt: `${TODAY} 12:00:00`,
  });

  await syncNow(owner);

  const [block] = await owner.query(api.queries.boardSchedule.listForWeek.listForWeek, {
    anchorDateJst: TODAY,
    view: "week",
  });
  expect(block?.startAt).toBe(`${TODAY} 12:00:00`);
  expect(google.active(PRIMARY)[0]?.start).toEqual({ dateTime: "2026-08-17T12:00:00+09:00" });
});

test("Google で予定を終日にされたら戻さず、次の送信でアプリの時刻に書き戻す", async () => {
  const { owner, t } = await connectedOwner();
  const rowId = await firstRowId(owner);
  await owner.mutation(api.mutations.boardSchedule.create.create, {
    endAt: `${TODAY} 10:30:00`,
    rowId,
    startAt: `${TODAY} 09:00:00`,
  });
  await flush(t);
  const [event] = google.active(PRIMARY);
  if (event === undefined) {
    throw new Error("expected the block in Google");
  }
  google.upsertExternal(PRIMARY, {
    ...event,
    end: { date: "2026-08-18" },
    start: { date: "2026-08-17" },
  });

  await syncNow(owner);

  const [block] = await owner.query(api.queries.boardSchedule.listForWeek.listForWeek, {
    anchorDateJst: TODAY,
    view: "week",
  });
  expect(block?.startAt).toBe(`${TODAY} 09:00:00`);
  expect(google.active(PRIMARY)[0]?.start).toEqual({ dateTime: "2026-08-17T09:00:00+09:00" });
});

test("外部予定の送信は一時的な失敗なら再試行し、諦めたら差分トークンを捨てて error にする", async () => {
  const { owner, t } = await connectedOwner();
  google.upsertExternal(PRIMARY, {
    end: { dateTime: "2026-08-18T11:00:00+09:00" },
    id: "dentist",
    start: { dateTime: "2026-08-18T10:00:00+09:00" },
    status: "confirmed",
    summary: "歯医者",
  });
  await syncNow(owner);
  const [external] = await owner.query(api.queries.calendarSync.listExternal.listExternal, {
    anchorDateJst: TODAY,
    view: "week",
  });
  if (external === undefined) {
    throw new Error("expected the external event");
  }
  const original = google.fetch;
  let patches = 0;
  vi.stubGlobal("fetch", async (input: string | URL | Request, init?: RequestInit) => {
    if ((init?.method ?? "GET") === "PATCH") {
      patches += 1;
      return json(
        { error: { message: patches === 1 ? "Backend Error" : "Bad Request" } },
        patches === 1 ? 503 : 400,
      );
    }
    return original(input, init);
  });

  await owner.mutation(api.mutations.calendarSync.moveExternal.moveExternal, {
    endAt: "2026-08-18 15:00:00",
    externalId: external._id,
    startAt: "2026-08-18 14:00:00",
  });
  await flush(t);

  expect(patches).toBe(2);
  const status = await owner.query(api.queries.calendarSync.status.status, {});
  expect(status.connections[0]?.status).toBe("error");
  expect(status.connections[0]?.lastError).toBe("Bad Request");
  await t.run(async (ctx) => {
    const cursors = await ctx.db.query("calendarSyncCursors").collect();
    expect(cursors.some((cursor) => cursor.calendarId === PRIMARY)).toBe(false);
  });
});

test("別の Google アカウントで再接続すると前の同期状態は消え、同じアカウントなら表示カレンダーの選択は残る", async () => {
  const { owner, t } = await connectedOwner();
  await owner.mutation(api.mutations.goals.create.create, { goal: EXAM_GOAL });
  await syncNow(owner);
  await owner.mutation(api.mutations.calendarSync.setVisibleCalendars.setVisibleCalendars, {
    calendarIds: [PRIMARY],
  });
  await flush(t);

  await connectAccount(owner);
  expect(
    (await owner.query(api.queries.calendarSync.status.status, {})).connections[0]
      ?.visibleCalendarIds,
  ).toEqual([PRIMARY]);

  tokenState.accounts = [{ accountId: "another-google-sub", scopes: CALENDAR_SCOPES }];
  await connectAccount(owner, "another-google-sub");
  const status = await owner.query(api.queries.calendarSync.status.status, {});
  expect(status.connections).toHaveLength(2);
  expect(status.connections[1]?.visibleCalendarIds).toEqual([PRIMARY, HOLIDAY]);
  expect(google.active(PRIMARY).map((event) => event.summary)).toEqual(["本番: 本番で900点を取る"]);
});

vi.mock("./services/days/serviceStartDate", () => ({ serviceStartDate: async () => "2026-01-01" }));
