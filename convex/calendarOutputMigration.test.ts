import { Result } from "better-result";
import { convexTest } from "convex-test";
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";

import { api, internal } from "./_generated/api";
import { GOOGLE_CALENDAR_WRITE_SCOPES } from "./lib/calendarSync";
import { GoogleCalendarError, deleteEvent, insertEvent } from "./lib/googleCalendar";
import schema from "./schema";
import { connect } from "./services/calendarSync/connect";

const tokenState = vi.hoisted(() => ({ fail: false, revoked: true, failedAccount: "" }));
vi.mock("./lib/googleAccessToken", () => ({
  getGoogleAccessToken: async (_ctx: unknown, args: { accountId: string }) =>
    tokenState.fail || args.accountId === tokenState.failedAccount
      ? Result.err({ revoked: tokenState.revoked, message: "expired" })
      : Result.ok("token"),
  listGoogleAccounts: async () => [
    {
      accountId: "personal",
      scopes: [...GOOGLE_CALENDAR_WRITE_SCOPES],
    },
  ],
}));
vi.mock("./lib/googleCalendar", async (original) => ({
  ...(await original<typeof import("./lib/googleCalendar")>()),
  deleteEvent: vi.fn(),
  insertEvent: vi.fn(),
  listCalendars: async () =>
    Result.ok([{ id: "personal-calendar", primary: true, summary: "個人", accessRole: "owner" }]),
  listEvents: async () => Result.ok({ items: [], nextSyncToken: "cursor" }),
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
  tokenState.fail = false;
  tokenState.failedAccount = "";
  tokenState.revoked = true;
  vi.mocked(insertEvent)
    .mockReset()
    .mockResolvedValue(Result.ok({ id: "new-event", updated: "2026-09-07T00:00:00Z" }));
  vi.mocked(deleteEvent).mockReset().mockResolvedValue(Result.ok(undefined));
});
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
});

async function setup(calendarId = "work-calendar") {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity({ subject: "owner" });
  const personal = await t.run((ctx) =>
    ctx.db.insert("calendarConnections", {
      ownerId: "owner",
      googleAccountId: "personal",
      primaryCalendarId: "personal-calendar",
      calendars: [{ id: "personal-calendar", primary: true, summary: "個人", accessRole: "owner" }],
      visibleCalendarIds: ["personal-calendar"],
      status: "ok",
    }),
  );
  const work = await t.mutation(internal.mutations.calendarSync.upsertConnection.upsertConnection, {
    ownerId: "owner",
    googleAccountId: "work",
    googleEmail: "work@example.com",
    calendars: [{ id: calendarId, primary: true, summary: "仕事", accessRole: "owner" }],
    defaultVisibleCalendarIds: [calendarId],
    canWrite: true,
  });
  const sourceId = await owner.mutation(api.mutations.goals.create.create, {
    goal: { type: "exam", content: "試験", examDate: "2026-09-15", minScore: 70, maxScore: 100 },
  });
  const linkId = await t.run((ctx) =>
    ctx.db.insert("calendarSyncLinks", {
      ownerId: "owner",
      calendarId: "personal-calendar",
      googleEventId: "old-event",
      sourceKind: "goal",
      sourceId,
    }),
  );
  return { t, owner, personal, work, sourceId, linkId };
}

test("出力先の変更はCairn予定だけを移し、学習目標を保持する", async () => {
  const { t, owner, work, sourceId, linkId } = await setup();
  expect(
    await owner.action(api.actions.calendarSync.setOutput.setOutput, {
      connectionId: work,
      calendarId: "work-calendar",
    }),
  ).toBe("ok");
  expect(insertEvent).toHaveBeenCalledTimes(1);
  expect(deleteEvent).toHaveBeenCalledWith(
    { accessToken: "token" },
    "personal-calendar",
    "old-event",
  );
  expect(await t.run((ctx) => ctx.db.get("goals", sourceId))).not.toBeNull();
  expect(await t.run((ctx) => ctx.db.get("calendarSyncLinks", linkId))).toMatchObject({
    connectionId: work,
    calendarId: "work-calendar",
    googleEventId: "new-event",
  });
  expect(await owner.query(api.queries.calendarSync.status.status, {})).toMatchObject({
    output: { connectionId: work, calendarId: "work-calendar" },
    outputChanging: false,
  });
});

test("旧予定削除の失敗後も新コピーを重複作成せず再開する", async () => {
  const { t, owner, work, linkId } = await setup();
  vi.mocked(deleteEvent).mockResolvedValueOnce(
    Result.err(
      new GoogleCalendarError({
        reason: null,
        status: 503,
        message: "unavailable",
        operation: "delete",
      }),
    ),
  );
  await expect(
    owner.action(api.actions.calendarSync.setOutput.setOutput, {
      connectionId: work,
      calendarId: "work-calendar",
    }),
  ).rejects.toThrow(/再試行/);
  expect(await t.run((ctx) => ctx.db.get("calendarSyncLinks", linkId))).toMatchObject({
    googleEventId: "old-event",
    pendingMove: { googleEventId: "new-event" },
  });
  await owner.action(api.actions.calendarSync.setOutput.setOutput, {
    connectionId: work,
    calendarId: "work-calendar",
  });
  expect(insertEvent).toHaveBeenCalledTimes(1);
  expect(deleteEvent).toHaveBeenCalledTimes(2);
});

test("同じ実カレンダーへの接続切替ではGoogle予定IDを維持する", async () => {
  const { t, owner, work, linkId } = await setup("personal-calendar");
  await owner.action(api.actions.calendarSync.setOutput.setOutput, {
    connectionId: work,
    calendarId: "personal-calendar",
  });
  expect(insertEvent).not.toHaveBeenCalled();
  expect(deleteEvent).not.toHaveBeenCalled();
  expect(await t.run((ctx) => ctx.db.get("calendarSyncLinks", linkId))).toMatchObject({
    connectionId: work,
    googleEventId: "old-event",
  });
});

test("古い出力世代の送信結果は新しい対応表を上書きしない", async () => {
  const { t, owner, work, personal, sourceId } = await setup("personal-calendar");
  await owner.action(api.actions.calendarSync.setOutput.setOutput, {
    connectionId: work,
    calendarId: "personal-calendar",
  });
  expect(
    await t.mutation(internal.mutations.calendarSync.recordPush.recordPush, {
      ownerId: "owner",
      connectionId: personal,
      generation: 0,
      calendarId: "personal-calendar",
      sourceKind: "goal",
      sourceId,
      expected: "old-event",
      outcome: { kind: "deleted" },
    }),
  ).toBe("disconnected");
  expect(await t.run((ctx) => ctx.db.query("calendarSyncLinks").unique())).toMatchObject({
    googleEventId: "old-event",
    connectionId: work,
  });
});

test("移行途中の接続解除を拒否して未処理のGoogleコピーを保持する", async () => {
  const { owner, work } = await setup();
  vi.mocked(deleteEvent).mockResolvedValue(
    Result.err(
      new GoogleCalendarError({
        reason: null,
        status: 503,
        message: "unavailable",
        operation: "delete",
      }),
    ),
  );
  await expect(
    owner.action(api.actions.calendarSync.setOutput.setOutput, {
      connectionId: work,
      calendarId: "work-calendar",
    }),
  ).rejects.toThrow();
  await expect(
    owner.action(api.actions.calendarSync.disconnect.disconnect, { connectionId: work }),
  ).rejects.toThrow(/変更を完了/);
});

test("出力先の認可失効時は警告を返して接続を解除し元の目標を残す", async () => {
  const { t, owner, personal, sourceId, work } = await setup();
  tokenState.fail = true;
  expect(
    await owner.action(api.actions.calendarSync.disconnect.disconnect, { connectionId: personal }),
  ).toMatchObject({ warning: expect.stringContaining("残っている可能性") });
  expect(await t.run((ctx) => ctx.db.get("goals", sourceId))).not.toBeNull();
  expect(await owner.query(api.queries.calendarSync.status.status, {})).toMatchObject({
    connections: [{ connectionId: work }],
    output: null,
  });
});

test("他人の接続を出力先に選べない", async () => {
  const { t, work } = await setup();
  await expect(
    t.withIdentity({ subject: "other" }).action(api.actions.calendarSync.setOutput.setOutput, {
      connectionId: work,
      calendarId: "work-calendar",
    }),
  ).rejects.toThrow(/見つかりません/);
  expect(insertEvent).not.toHaveBeenCalled();
});

test("移行が50件を超えても分割再開し、全件移行まで変更中を維持する", async () => {
  const { t, owner, work } = await setup();
  for (let index = 0; index < 55; index += 1) {
    const sourceId = await t.run((ctx) =>
      ctx.db.insert("goals", {
        ownerId: "owner",
        type: "mastery",
        content: `試験${String(index)}`,
        criterion: "合格",
        deadline: "2026-09-15",
        activeDays: 0,
        confirmedMinutes: 0,
      }),
    );
    await t.run((ctx) =>
      ctx.db.insert("calendarSyncLinks", {
        ownerId: "owner",
        calendarId: "personal-calendar",
        googleEventId: `old-${String(index)}`,
        sourceKind: "goal",
        sourceId,
      }),
    );
  }
  vi.mocked(insertEvent).mockImplementation(async (_client, _calendar, _payload, id) =>
    Result.ok({ id: id ?? "missing-id", updated: "2026-09-07T00:00:00Z" }),
  );
  expect(
    await owner.action(api.actions.calendarSync.setOutput.setOutput, {
      connectionId: work,
      calendarId: "work-calendar",
    }),
  ).toBe("moving");
  expect((await owner.query(api.queries.calendarSync.status.status, {})).outputChanging).toBe(true);
  expect(await owner.action(api.actions.calendarSync.retryOutputChange.retryOutputChange, {})).toBe(
    "ok",
  );
  expect(insertEvent).toHaveBeenCalledTimes(56);
  expect(new Set(vi.mocked(insertEvent).mock.calls.map((call) => call[3])).size).toBe(56);
  expect((await owner.query(api.queries.calendarSync.status.status, {})).outputChanging).toBe(
    false,
  );
});

test("一時的なトークン更新障害では解除を完了せず対応表を保持する", async () => {
  const { t, owner, personal, linkId } = await setup();
  tokenState.fail = true;
  tokenState.revoked = false;
  await expect(
    owner.action(api.actions.calendarSync.disconnect.disconnect, { connectionId: personal }),
  ).rejects.toThrow(/もう一度解除/);
  expect(await t.run((ctx) => ctx.db.get("calendarSyncLinks", linkId))).toMatchObject({
    googleEventId: "old-event",
  });
  expect(await t.run((ctx) => ctx.db.get("calendarConnections", personal))).not.toBeNull();
  expect(deleteEvent).not.toHaveBeenCalled();
});

test("作成応答を失った後に元の予定を削除しても移行先の孤立コピーを消す", async () => {
  const { t, owner, work, sourceId } = await setup();
  vi.mocked(insertEvent).mockResolvedValueOnce(
    Result.err(
      new GoogleCalendarError({
        reason: null,
        status: null,
        operation: "insert",
        message: "response lost",
      }),
    ),
  );
  await expect(
    owner.action(api.actions.calendarSync.setOutput.setOutput, {
      connectionId: work,
      calendarId: "work-calendar",
    }),
  ).rejects.toThrow();
  const createdId = vi.mocked(insertEvent).mock.calls[0]?.[3];
  expect(createdId).toMatch(/^cairn[0-9a-f]{64}$/);
  await t.run((ctx) => ctx.db.delete("goals", sourceId));
  await owner.action(api.actions.calendarSync.retryOutputChange.retryOutputChange, {});
  expect(deleteEvent).toHaveBeenCalledWith({ accessToken: "token" }, "work-calendar", createdId);
  expect(await t.run((ctx) => ctx.db.query("calendarSyncLinks").collect())).toEqual([]);
});

test("旧出力の失効後も同じ接続を再認可して保留移行を再開できる", async () => {
  const { t, owner, personal, work, linkId } = await setup();
  tokenState.failedAccount = "personal";
  await expect(
    owner.action(api.actions.calendarSync.setOutput.setOutput, {
      connectionId: work,
      calendarId: "work-calendar",
    }),
  ).rejects.toThrow(/再接続/);
  expect(await t.run((ctx) => ctx.db.get("calendarConnections", personal))).toMatchObject({
    status: "needsReauth",
  });
  expect(await t.run((ctx) => ctx.db.get("calendarSyncLinks", linkId))).toMatchObject({
    pendingMove: { googleEventId: "new-event" },
  });
  const before = await t.run((ctx) => ctx.db.query("calendarOutputSettings").unique());
  tokenState.failedAccount = "";
  await owner.action((ctx) => connect(ctx, "owner", "personal"));
  expect(await t.run((ctx) => ctx.db.get("calendarConnections", personal))).toMatchObject({
    externalReadOnly: false,
    status: "ok",
  });
  expect(await t.run((ctx) => ctx.db.query("calendarOutputSettings").unique())).toMatchObject({
    generation: before?.generation,
    changing: true,
    nextConnectionId: work,
  });
  expect(await owner.action(api.actions.calendarSync.retryOutputChange.retryOutputChange, {})).toBe(
    "ok",
  );
  expect(insertEvent).toHaveBeenCalledTimes(1);
  expect(await owner.query(api.queries.calendarSync.status.status, {})).toMatchObject({
    outputChanging: false,
    output: { connectionId: work, calendarId: "work-calendar" },
  });
});

test("出力移行中の一時的な認可サーバー障害は再認可を要求しない", async () => {
  const { t, owner, work } = await setup();
  tokenState.failedAccount = "work";
  tokenState.revoked = false;
  await expect(
    owner.action(api.actions.calendarSync.setOutput.setOutput, {
      connectionId: work,
      calendarId: "work-calendar",
    }),
  ).rejects.toThrow(/移動を再開/);
  expect(await t.run((ctx) => ctx.db.get("calendarConnections", work))).toMatchObject({
    status: "error",
  });
  tokenState.failedAccount = "";
  expect(await owner.action(api.actions.calendarSync.retryOutputChange.retryOutputChange, {})).toBe(
    "ok",
  );
});

test("移行保留中の新コピーを別接続から取得しても外部予定に反映しない", async () => {
  const { t, owner, work } = await setup();
  tokenState.failedAccount = "personal";
  await expect(
    owner.action(api.actions.calendarSync.setOutput.setOutput, {
      connectionId: work,
      calendarId: "work-calendar",
    }),
  ).rejects.toThrow();
  await t.mutation(internal.mutations.calendarSync.applyPull.applyPull, {
    ownerId: "owner",
    connectionId: work,
    calendarId: "work-calendar",
    generation: 1,
    todayJst: "2026-09-07",
    finish: null,
    events: [
      {
        kind: "upsert",
        calendarId: "work-calendar",
        googleEventId: "new-event",
        title: "移行中のコピー",
        allDay: false,
        startAt: "2026-09-07 10:00:00",
        endAt: "2026-09-07 11:00:00",
        updated: "2026-09-07T00:00:00Z",
      },
    ],
  });
  expect(await t.run((ctx) => ctx.db.query("externalCalendarEvents").collect())).toEqual([]);
  expect(
    await owner.query(api.queries.calendarSync.listExternal.listExternal, {
      anchorDateJst: "2026-09-07",
      view: "day",
    }),
  ).toEqual([]);
});

test("元の接続が消えた対応表だけが残ったら、移動を再スケジュールせずに止めて知らせる", async () => {
  const { t, owner, work } = await setup();
  await t.run(async (ctx) => {
    const ghost = await ctx.db.insert("calendarConnections", {
      ownerId: "owner",
      googleAccountId: "ghost",
      primaryCalendarId: "ghost-calendar",
      calendars: [],
      visibleCalendarIds: [],
      status: "ok",
    });
    const sourceId = await ctx.db.insert("goals", {
      ownerId: "owner",
      type: "mastery",
      content: "孤立",
      criterion: "合格",
      deadline: "2026-09-15",
      activeDays: 0,
      confirmedMinutes: 0,
    });
    await ctx.db.insert("calendarSyncLinks", {
      ownerId: "owner",
      connectionId: ghost,
      calendarId: "ghost-calendar",
      googleEventId: "ghost-event",
      sourceKind: "goal",
      sourceId,
    });
    await ctx.db.delete("calendarConnections", ghost);
  });
  expect(
    await owner.action(api.actions.calendarSync.setOutput.setOutput, {
      connectionId: work,
      calendarId: "work-calendar",
    }),
  ).toBe("moving");
  await expect(
    owner.action(api.actions.calendarSync.retryOutputChange.retryOutputChange, {}),
  ).rejects.toThrow(/移動を完了できませんでした/);
  expect(await owner.query(api.queries.calendarSync.status.status, {})).toMatchObject({
    outputChanging: true,
    connections: expect.arrayContaining([
      expect.objectContaining({ connectionId: work, status: "error" }),
    ]),
  });
});
